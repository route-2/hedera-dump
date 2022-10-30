require("dotenv").config();
const {
  AccountId,
  PrivateKey,
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  TokenAssociateTransaction,
} = require("@hashgraph/sdk");

// Configure accounts and client, and generate needed keys
const operatorId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);
const treasuryId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const treasuryKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);
const snehaId = AccountId.fromString(process.env.SIGNER_ID);
const snehaKey = PrivateKey.fromString(process.env.SIGNER_PVKEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

const supplyKey = PrivateKey.generate();

async function main() {
  //Create the NFT
  let nftCreate = await new TokenCreateTransaction()
    .setTokenName("diploma")
    .setTokenSymbol("GRAD")
    .setTokenType(TokenType.NonFungibleUnique)
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(treasuryId)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(250)
    .setSupplyKey(supplyKey)
    .freezeWith(client);

  //Sign the transaction with the treasury key
  let nftCreateTxSign = await nftCreate.sign(treasuryKey);

  //Submit the transaction to a Hedera network
  let nftCreateSubmit = await nftCreateTxSign.execute(client);

  //Get the transaction receipt
  let nftCreateRx = await nftCreateSubmit.getReceipt(client);

  //Get the token ID
  let tokenId = nftCreateRx.tokenId;

  //Log the token ID
  console.log(`- Created NFT with Token ID: ${tokenId} \n`);

  //IPFS content identifiers for which we will create a NFT
  CID = ["QmTzWcVfk88JRqjTpVwHzBeULRTNzHY7mnBSG42CpwHmPa"];

  // Mint new NFT
  let mintTx = await new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata([Buffer.from(CID)])
    .freezeWith(client);

  //Sign the transaction with the supply key
  let mintTxSign = await mintTx.sign(supplyKey);

  //Submit the transaction to a Hedera network
  let mintTxSubmit = await mintTxSign.execute(client);

  //Get the transaction receipt
  let mintRx = await mintTxSubmit.getReceipt(client);

  //Log the serial number
  console.log(`- Created NFT ${tokenId} with serial: ${mintRx.serials[0].low} \n`);
  
  //Create the associate transaction and sign with Sneha's key 
  let associateSnehaTx = await new TokenAssociateTransaction()
    .setAccountId(snehaId)
    .setTokenIds([tokenId])
    .freezeWith(client)
    .sign(snehaKey);

  //Submit the transaction to a Hedera network
  let associateSnehaTxSubmit = await associateSnehaTx.execute(client);

  //Get the transaction receipt
  let associateSnehaRx = await associateSnehaTxSubmit.getReceipt(client);

  //Confirm the transaction was successful
  console.log(`- NFT association with Sneha's account: ${associateSnehaRx.status}\n`);


  // Check the balance before the transfer for the treasury account
  var balanceCheckTx = await new AccountBalanceQuery().setAccountId(treasuryId).execute(client);
  console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);

  // Check the balance before the transfer for Sneha's account
  var balanceCheckTx = await new AccountBalanceQuery().setAccountId(snehaId).execute(client);
  console.log(`- Sneha's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);

  // Transfer the NFT from treasury to Sneha
  // Sign with the treasury key to authorize the transfer
  let tokenTransferTx = await new TransferTransaction()
    .addNftTransfer(tokenId, 1, treasuryId, snehaId)
    .freezeWith(client)
    .sign(treasuryKey);

  let tokenTransferSubmit = await tokenTransferTx.execute(client);
  let tokenTransferRx = await tokenTransferSubmit.getReceipt(client);

  console.log(`\n- NFT transfer from Treasury to Sneha: ${tokenTransferRx.status} \n`);
}

main();