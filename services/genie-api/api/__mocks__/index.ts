export function createMockAnthropic({ answer = "Mock response", throwStatus = 0 } = {}) {
  const mock = {
    _lastModel: "",
    messages: {
      create: async (params: any) => {
        mock._lastModel = params.model;
        if (throwStatus > 0) {
          const err = new Error("Upstream error");
          (err as any).status = throwStatus;
          throw err;
        }
        return {
          content: [{ type: "text", text: answer }],
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_read_input_tokens: 10,
            cache_creation_input_tokens: 5,
          }
        };
      }
    },
    lastCallModel: () => mock._lastModel
  };
  return mock as any;
}

export function createMockRateLimiter({ allowed = true, remaining = 20, resetAt = new Date() } = {}) {
  return {
    check: async (hashedUserId: string) => {
      return { allowed, remaining, resetAt };
    }
  } as any;
}
