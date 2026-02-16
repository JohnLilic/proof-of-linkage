const {
  Client,
  TopicMessageSubmitTransaction,
  PrivateKey,
  TopicId,
} = require("@hashgraph/sdk");

let client = null;

function getClient() {
  if (client) return client;
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  if (!operatorId || !operatorKey) {
    throw new Error("Missing Hedera credentials");
  }
  client = Client.forTestnet();
  client.setOperator(operatorId, PrivateKey.fromStringDer(operatorKey));
  return client;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const hederaClient = getClient();
    const userAgent = req.headers["user-agent"] || "unknown";

    const message = JSON.stringify({
      type: "machine-state-update",
      machineId: "TEKSIC-PVT-001",
      event: "web-scan",
      timestamp: new Date().toISOString(),
      data: {
        source: "web-app",
        userAgent: userAgent,
      },
    });

    const tx = new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString("0.0.7947854"))
      .setMessage(message);

    const response = await tx.execute(hederaClient);
    const receipt = await response.getReceipt(hederaClient);

    const transactionId = response.transactionId.toString();
    const sequenceNumber = receipt.topicSequenceNumber.toString();

    res.status(200).json({
      success: true,
      transactionId,
      sequenceNumber: Number(sequenceNumber),
      message: JSON.parse(message),
    });
  } catch (err) {
    console.error("submit-scan error:", err);
    res.status(500).json({ error: err.message || "Transaction failed" });
  }
};
