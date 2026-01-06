import { Keypair, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

// If using Node <18, install node-fetch and uncomment the next line:
// import fetch from 'node-fetch';

const JITO_RPC_URL = process.env.JITO_RPC_URL || 'https://your-jito-jito-rpc.example';
const JITO_AUTH_TOKEN = process.env.JITO_AUTH_TOKEN || '';

if (!JITO_RPC_URL) throw new Error('Please set JITO_RPC_URL env var');
if (!JITO_AUTH_TOKEN) throw new Error('Please set JITO_AUTH_TOKEN env var');

async function rpcRequest(method: string, params: any[]) {
  const res = await fetch(JITO_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // The important header for Jito authentication:
      'x-jito-auth': JITO_AUTH_TOKEN,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function main() {
  // Example payer and recipient (for a real send, use a funded keypair)
  const payer = Keypair.generate();
  const recipient = Keypair.generate().publicKey;

  // 1) Get a recent blockhash from the Jito endpoint (so it's valid for the node you're sending to)
  const latestBlockhashResult = await rpcRequest('getLatestBlockhash', []);
  // Structure: { blockhash: string, lastValidBlockHeight: number } or legacy result under value
  const blockhash =
    latestBlockhashResult?.value?.blockhash ?? latestBlockhashResult?.blockhash;
  if (!blockhash) throw new Error('Could not get latest blockhash from RPC');

  // 2) Build a simple transfer transaction
  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: payer.publicKey,
  });

  tx.add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: recipient,
      lamports: 1_000, // tiny amount for example
    })
  );

  // 3) Sign the transaction
  tx.sign(payer);

  // 4) Serialize to base64
  const raw = tx.serialize();
  const rawBase64 = raw.toString('base64');

  // 5) Send via sendRawTransaction with x-jito-auth header
  const sendResult = await rpcRequest('sendRawTransaction', [rawBase64, { skipPreflight: false }]);
  console.log('sendRawTransaction result:', sendResult);
}

main().catch((err) => {
  console.error('error:', err);
  process.exit(1);
});