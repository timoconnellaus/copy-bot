import Web3 from "web3";
import inquirer from "inquirer";
import { parse } from "yaml";
import { file } from "bun";

interface Chain {
  rpc: string;
  name: string;
}

interface Wallet {
  address: string;
  pk: string;
}

const chains: Chain[] = [
  {
    name: "Arbitrum",
    rpc: "https://arb1.arbitrum.io/rpc",
  },
  {
    name: "BSC",
    rpc: "https://bsc-dataseed.binance.org/",
  },
];

// Create a Web3 instance

async function existingTransaction(web3: Web3, transactionId: string) {
  const transaction = await web3.eth.getTransaction(transactionId);

  if (!transaction) {
    console.error("Transaction not found");
    return false;
  }

  console.log("Transaction details:", transaction);
  return true;
}

// Function to retrieve transaction details and create new transactions
async function copyTransaction(
  web3: Web3,
  transactionId: string,
  newWallets: Wallet[],
) {
  try {
    // Retrieve the transaction details
    const transaction = await web3.eth.getTransaction(transactionId);

    // Extract the relevant transaction details
    const { to, value, input, gas, gasPrice } = transaction;

    // Create new transactions for each new wallet
    for (const { address, pk } of newWallets) {
      // confirm
      const confirm = await inquirer.prompt({
        type: "confirm",
        name: "confirm",
        message: `Run tranasction for ${address}?`,
      });

      if (!confirm.confirm) {
        continue;
      }

      const newTransaction = {
        from: address,
        to,
        value,
        data: input,
        gas,
        gasPrice,
      };

      // Sign the transaction with the wallet's private key
      const signedTransaction = await web3.eth.accounts.signTransaction(
        newTransaction,
        pk,
      );

      // Send the signed transaction
      const receipt = await web3.eth.sendSignedTransaction(
        signedTransaction.rawTransaction,
      );
      console.log(
        `New transaction hash for ${address}:`,
        receipt.transactionHash,
      );
    }
  } catch (error) {
    console.error("Error copying transaction:", error);
  }
}

const main = async () => {
  const chainQuestion = await inquirer.prompt({
    type: "list",
    name: "chain",
    message: "Which chain?",
    choices: chains.map((chain) => chain.name),
  });
  const chainAnswer = chains.find((c) => c.name === chainQuestion.chain);

  const txHash = await inquirer.prompt({
    type: "input",
    name: "txHash",
    message: "Transaction Hash",
  });

  if (!chainAnswer) {
    console.error("Invalid chain");
    return;
  }

  const web3 = new Web3(chainAnswer.rpc);

  const txExists = await existingTransaction(web3, txHash.txHash);

  if (!txExists) {
    return;
  }

  const walletFile = await file("./wallets.yaml").text();
  const wallets = parse(walletFile) as Wallet[];

  await copyTransaction(web3, txHash.txHash, wallets);
};

main();
