import { buildHmacHeaders } from "@/utils/hmacAuth";

describe("buildHmacHeaders", () => {
  it("生成した署名が固定入力で安定すること", () => {
    const headers = buildHmacHeaders(
      "POST",
      "/ai/test",
      { hello: "world" },
      { apiKey: "dev-key", apiSecret: "dev-secret" },
      { timestamp: 1735787045, nonce: "rn-fixed-nonce" }
    );

    expect(headers["X-Api-Key"]).toBe("dev-key");
    expect(headers["X-Timestamp"]).toBe("1735787045");
    expect(headers["X-Nonce"]).toBe("rn-fixed-nonce");
    expect(headers["X-Signature"]).toBe("d89ebaaa5905d78d2240ae0edc897c7f9e5d1884582d6231f7965532ce00b23a");
  });
});
