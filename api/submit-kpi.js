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

    const kwhValue = Math.round((35 + Math.random() * 15) * 10) / 10;

    const message = JSON.stringify({
      type: "energy-kpi",
      version: "1.0",
      machineId: "TEKSIC-PVT-001",
      nftTokenId: "0.0.7947870",
      nftSerial: 1,
      kpi: {
        name: "energy_per_cycle_kwh",
        value: kwhValue,
        unit: "kWh",
        source: "web-demo",
      },
      reportedAt: new Date().toISOString(),
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
    console.error("submit-kpi error:", err);
    res.status(500).json({ error: err.message || "Transaction failed" });
  }
};
