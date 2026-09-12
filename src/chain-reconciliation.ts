import { createPublicClient, http, decodeEventLog, parseAbiItem, type Hex } from 'viem';
import { sepolia } from 'viem/chains';
import { demoTreasury, type ConfirmedPayment } from './ledger';

const event = parseAbiItem('event PaymentSettled(bytes32 indexed requestId, address indexed recipient, address token, uint256 amount)');
export function extractPayment(receipt: { status: string; transactionHash: string; logs: {address:string;data:Hex;topics:readonly Hex[]}[] }): ConfirmedPayment {
 if(receipt.status!=='success')throw new Error('Payment transaction reverted');
 const matches=receipt.logs.filter(log=>log.address.toLowerCase()===demoTreasury).flatMap(log=>{
  try{const decoded=decodeEventLog({abi:[event],data:log.data,topics:log.topics as [Hex,...Hex[]],strict:true});return [decoded.args];}catch{return [];}
 });
 if(matches.length!==1)throw new Error('Expected one payment event from the configured Sepolia treasury');
 const p=matches[0];return {requestId:p.requestId,recipient:p.recipient.toLowerCase(),token:p.token.toLowerCase(),amount:p.amount.toString(),txHash:receipt.transactionHash.toLowerCase()};
}
export async function verifySepoliaPayment(txHash: string): Promise<ConfirmedPayment> {
 if(!/^0x[0-9a-fA-F]{64}$/.test(txHash))throw new Error('Invalid transaction hash');
 const client=createPublicClient({chain:sepolia,transport:http('https://ethereum-sepolia-rpc.publicnode.com',{timeout:15000,retryCount:1})});
 if(await client.getChainId()!==11155111)throw new Error('Unexpected network');
 const receipt=await client.getTransactionReceipt({hash:txHash as Hex});
 const [finalized,block]=await Promise.all([client.getBlock({blockTag:'finalized'}),client.getBlock({blockNumber:receipt.blockNumber})]);
 if(receipt.blockNumber>finalized.number)throw new Error('Payment is not finalized yet; retry later');
 if(block.hash!==receipt.blockHash)throw new Error('Receipt no longer belongs to the canonical chain');
 return extractPayment(receipt);
}
