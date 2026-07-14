import { GoogleGenAI } from "@google/genai";
import { serverConfig } from "../../../app/serverConfig";
import { toolRegistry } from "../../../agent/toolRegistry";
import { ToolExecutionContext } from "../../../agent/agentTypes";
import { moduleStateService } from "../../moduleStateService";
import { AppError } from "../../../../shared/errors/appError";
import { logger } from "../../../infrastructure/logging/logger";
import { aiUsageTracker } from "./aiUsageTracker";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = serverConfig.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError(
      "DEPENDENCY_UNAVAILABLE",
      "Khóa API Gemini (GEMINI_API_KEY) chưa được thiết lập trên máy chủ."
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export const geminiAgentService = {
  /**
   * Chạy luồng tương tác chat với Gemini Interactions API
   */
  async chatStream(
    params: {
      message: string;
      previousInteractionId?: string;
      context: ToolExecutionContext;
    },
    onEvent: (event: any) => void
  ): Promise<void> {
    const { message, previousInteractionId, context } = params;
    const requestId = context.requestId;

    // Check Kill Switch
    moduleStateService.assertModuleEnabled("gemini-agent", requestId);

    const ai = getGeminiClient();

    // Lấy danh sách công cụ được phép theo quyền của user
    const userTools = toolRegistry.getToolsForUser(context.permissions);

    // Chuẩn bị cấu hình tools cho Gemini
    const toolsConfig = userTools.map(t => ({
      type: "function" as const,
      name: t.name,
      description: t.description,
      parameters: t.inputSchema
    }));

    const interactionParams: any = {
      model: "gemini-3.5-flash",
      input: message,
      stream: true
    };

    if (previousInteractionId) {
      interactionParams.previous_interaction_id = previousInteractionId;
    }

    if (toolsConfig.length > 0) {
      interactionParams.tools = toolsConfig;
    }

    try {
      const stream = await ai.interactions.create(interactionParams);
      
      let totalChars = message.length;
      const trackedOnEvent = (event: any) => {
        if (event.content?.parts) {
          for (const part of event.content.parts) {
            if (part.text) {
              totalChars += part.text.length;
            }
          }
        }
        onEvent(event);
      };

      await this.parseStream(stream, userTools, context, trackedOnEvent);
      await aiUsageTracker.recordSuccess(totalChars);
    } catch (error: any) {
      await aiUsageTracker.recordError();
      logger.error(`Gemini Interactions API error: ${error?.message || error}`);
      throw new AppError(
        "DEPENDENCY_UNAVAILABLE",
        `Không thể kết nối tới dịch vụ AI Gemini: ${error?.message || "Lỗi không xác định"}`
      );
    }
  },

  /**
   * Tiếp tục tương tác sau khi có phản hồi duyệt/từ chối từ người dùng hoặc kết quả thủ công
   */
  async resumeWithToolResult(
    params: {
      previousInteractionId: string;
      toolCallId: string;
      toolName: string;
      approved: boolean;
      arguments: any;
      context: ToolExecutionContext;
    },
    onEvent: (event: any) => void
  ): Promise<void> {
    const { previousInteractionId, toolCallId, toolName, approved, arguments: toolArgs, context } = params;
    const requestId = context.requestId;

    moduleStateService.assertModuleEnabled("gemini-agent", requestId);

    const userTools = toolRegistry.getToolsForUser(context.permissions);
    const tool = userTools.find(t => t.name === toolName);

    let toolResult: any;

    if (!approved) {
      toolResult = { error: "Người dùng từ chối cấp quyền thực thi công cụ này." };
    } else {
      if (!tool) {
        toolResult = { error: `Công cụ '${toolName}' không khả dụng hoặc bị hạn chế quyền.` };
      } else {
        try {
          onEvent({
            event_type: "tool_executing",
            toolName,
            arguments: toolArgs
          });

          // Execute with approved arguments
          toolResult = await tool.execute(toolArgs, context);

          onEvent({
            event_type: "tool_executed",
            toolName,
            result: toolResult
          });
        } catch (error: any) {
          toolResult = { error: error?.message || "Lỗi thực thi công cụ." };
        }
      }
    }

    // Call helper to send function result to Gemini and parse the next turn
    await this.feedResultToGemini({
      previousInteractionId,
      toolCallId,
      toolName,
      result: toolResult,
      userTools,
      context,
      onEvent
    });
  },

  /**
   * Helper để phân tích luồng sự kiện (Stream Parser) và thực thi gọi hàm đệ quy
   */
  async parseStream(
    stream: any,
    userTools: any[],
    context: ToolExecutionContext,
    onEvent: (event: any) => void
  ): Promise<void> {
    let activeFunctionCall: { id: string; name: string; arguments: string } | null = null;
    let lastInteractionId = "";

    for await (const event of stream) {
      if (event.interaction?.id) {
        lastInteractionId = event.interaction.id;
      }

      // Gửi sự kiện SSE về cho client
      onEvent(event);

      // Phát hiện gọi hàm
      if (event.event_type === "step.start" && event.step?.type === "function_call") {
        activeFunctionCall = {
          id: event.step.id,
          name: event.step.name,
          arguments: ""
        };
      }

      if (event.event_type === "step.delta" && event.delta?.type === "function_call") {
        if (activeFunctionCall && event.delta.arguments) {
          activeFunctionCall.arguments += event.delta.arguments;
        }
      }

      if (event.event_type === "step.stop" && event.step?.type === "function_call") {
        const functionCallId = event.step.id;
        const toolName = event.step.name;

        let parsedArgs: any = {};
        try {
          parsedArgs = typeof event.step.arguments === "object"
            ? event.step.arguments
            : JSON.parse(event.step.arguments || activeFunctionCall?.arguments || "{}");
        } catch (err) {
          parsedArgs = {};
        }

        const tool = userTools.find(t => t.name === toolName);
        if (!tool) {
          await this.feedResultToGemini({
            previousInteractionId: lastInteractionId,
            toolCallId: functionCallId,
            toolName,
            result: { error: `Công cụ '${toolName}' không tồn tại hoặc bị chặn quyền.` },
            userTools,
            context,
            onEvent
          });
          return;
        }

        // Kiểm tra cơ chế duyệt thủ công (Manual Approval Required)
        if (tool.requiresApproval) {
          onEvent({
            event_type: "tool_approval_required",
            interactionId: lastInteractionId,
            toolCallId: functionCallId,
            toolName,
            arguments: parsedArgs
          });
          return; // Dừng luồng ở đây, đợi duyệt từ Client
        } else {
          // Thực thi tự động trực tiếp
          try {
            onEvent({
              event_type: "tool_executing",
              toolName,
              arguments: parsedArgs
            });

            const result = await tool.execute(parsedArgs, context);

            onEvent({
              event_type: "tool_executed",
              toolName,
              result
            });

            await this.feedResultToGemini({
              previousInteractionId: lastInteractionId,
              toolCallId: functionCallId,
              toolName,
              result,
              userTools,
              context,
              onEvent
            });
          } catch (error: any) {
            logger.error(`Error executing tool ${toolName}: ${error?.message || error}`);
            await this.feedResultToGemini({
              previousInteractionId: lastInteractionId,
              toolCallId: functionCallId,
              toolName,
              result: { error: error?.message || "Lỗi thực thi công cụ bên trong hệ thống." },
              userTools,
              context,
              onEvent
            });
          }
          return;
        }
      }
    }
  },

  /**
   * Chuyển kết quả thực thi công cụ về lại Gemini để sinh câu trả lời cuối cùng
   */
  async feedResultToGemini(params: {
    previousInteractionId: string;
    toolCallId: string;
    toolName: string;
    result: any;
    userTools: any[];
    context: ToolExecutionContext;
    onEvent: (event: any) => void;
  }): Promise<void> {
    const { previousInteractionId, toolCallId, toolName, result, userTools, context, onEvent } = params;
    const ai = getGeminiClient();

    const toolsConfig = userTools.map(t => ({
      type: "function" as const,
      name: t.name,
      description: t.description,
      parameters: t.inputSchema
    }));

    try {
      const stream = await ai.interactions.create({
        model: "gemini-3.5-flash",
        previous_interaction_id: previousInteractionId,
        input: [{
          type: "function_result",
          call_id: toolCallId,
          name: toolName,
          result: result
        }],
        tools: toolsConfig.length > 0 ? toolsConfig : undefined,
        stream: true
      });

      let totalChars = JSON.stringify(result).length;
      const trackedOnEvent = (event: any) => {
        if (event.content?.parts) {
          for (const part of event.content.parts) {
            if (part.text) {
              totalChars += part.text.length;
            }
          }
        }
        onEvent(event);
      };

      await this.parseStream(stream, userTools, context, trackedOnEvent);
      await aiUsageTracker.recordSuccess(totalChars);
    } catch (error: any) {
      await aiUsageTracker.recordError();
      logger.error(`Error feeding result back to Gemini: ${error?.message || error}`);
      throw new AppError(
        "DEPENDENCY_UNAVAILABLE",
        `Không thể gửi kết quả công cụ về Gemini: ${error?.message || "Lỗi không xác định"}`
      );
    }
  }
};
