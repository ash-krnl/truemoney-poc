"use client";

import { ethers } from "krnl-sdk";
import { abi as contractAbi, CONTRACT_ADDRESS, ENTRY_ID, ACCESS_TOKEN, KERNEL_ID } from "./config";

// ==========================================================
// Create a provider for KRNL RPC
const krnlProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_KRNL);

// ==========================================================
// Check if required environment variables are available
if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not found");
}

if (!ENTRY_ID || !ACCESS_TOKEN || !KERNEL_ID) {
    throw new Error("Entry ID, Access Token, or Kernel ID not found");
}

// ==========================================================
// Helper functions for encoding payload
const abiCoder = new ethers.AbiCoder();

// Helper function to convert decimal to wei (for ETH amounts)
export function toWei(amount: number | string) {
    return ethers.parseUnits(amount.toString(), 18);
}

// Helper function to convert wei to decimal (for ETH amounts)
export function fromWei(amount: bigint | string) {
    return ethers.formatUnits(amount, 18);
}

/**
 * Execute KRNL with the ComPilot transaction payload
 * @param address Wallet address to use (from wallet connection)
 * @param transactionData The transaction data to monitor
 * @param customKernelId Optional kernel ID to use (defaults to env variable)
 * @returns KRNL payload result
 */
export async function executeKrnl(address: string, transactionData: any, customKernelId?: string) {
    // Validate required parameters
    if (!address) {
        throw new Error("Wallet address is required");
    }
    
    if (!transactionData || !transactionData.externalTransactionId) {
        throw new Error("Transaction data with externalTransactionId is required");
    }
    
    // Use provided kernel ID or default to environment variable
    const kernelId = customKernelId || KERNEL_ID;
    
    // Generate a unique transaction ID using timestamp and random string
    const uniqueTransactionId = transactionData.externalTransactionId || 
        `tx-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Get the amount from transaction data
    const transactionAmount = transactionData.amount || 0.1;
    
    // Create the kernel request data with the correct structure
    const kernelRequestData = {
        senderAddress: address,
        kernelPayload: {
            [kernelId]: {
                "parameters": {
                    "query": {
                        "waitForWebhook": "true"
                    },
                    "header": {},
                    "body": {
                        "customerId": "78d29773-8aa6-4b33-aa53-2ffca3adbe7e",
                        "externalTransactionId": uniqueTransactionId,
                        "transactionDate": new Date().toISOString(),
                        "transactionType": "crypto",
                        "transactionSubType": "wallet transfer",
                        "transactionInfo": {
                            "direction": "IN",
                            "currencyCode": "ETH",
                            "blockchain": "eip155",
                            "chainId": "1",
                            "hash": "0x89c195a8b61fb201ce1fb31c6c5c28d3915d49bbb83b86d634f5646e02d6b323",
                            "amount": transactionAmount,
                            "fees": {
                                "networkFeeAmount": 0.002,
                                "platformFeeAmount": 0.001,
                                "networkFeeCurrencyCode": "ETH",
                                "platformFeeCurrencyCode": "ETH"
                            }
                        },
                        "originator": {
                            "type": "individual",
                            "name": "Bob Smith",                            
                            "transactionMethod": {
                                "type": "crypto",
                                "accountId": "0x7B5f55aE4f1Cb8a6bE0a9cD1FeE8F8C4cCfF9a3D"
                            }
                        },
                        "beneficiary": {
                            "type": "individual",
                            "name": "Alice Carter",
                            "transactionMethod": {
                                "type": "crypto",
                                "accountId": "0x4E6f1cB8C7A2E3A2DeAb69c4e0A9F798D6FcF8B8"
                            },
                            "institution": {
                                "name": "Binance",
                                "code": "BINANCE123"
                            }
                        }
                    }
                }
            }
        }
    } as any; // Use type assertion to bypass TypeScript type checking
    
    // Store the exact transaction ID in the transaction data for later use
    transactionData.externalTransactionId = uniqueTransactionId;
    
    // Ensure the transaction info has the correct amount
    if (!transactionData.transactionInfo) {
        transactionData.transactionInfo = {};
    }
    transactionData.transactionInfo.amount = transactionAmount;
    
    // Store the address in the transaction data
    transactionData.address = address;
    
    // Encode the parameters for the contract function
    // These are the parameters that will be verified by the onlyAuthorized modifier
    const functionParams = abiCoder.encode(
        ["string", "uint256", "address"], 
        [
            uniqueTransactionId, // Use the generated unique transaction ID
            toWei(transactionAmount), // Use the input amount
            address // Use the connected wallet address
        ]
    );
    
    // Execute KRNL kernels
    const krnlPayload = await krnlProvider.executeKernels(
        ENTRY_ID, 
        ACCESS_TOKEN, 
        kernelRequestData, 
        functionParams
    );
    
    return krnlPayload;
}

/**
 * Call the processMonitoredTransaction function on the TransactionMonitor contract
 * @param executeResult The result from executeKrnl
 * @param transactionData The transaction data being monitored
 * @param signer The signer to use for the transaction
 * @returns Transaction hash
 */
export async function processMonitoredTransaction(executeResult: any, transactionData: any, signer: ethers.Signer) {
    if (!signer) {
        throw new Error("Signer is required");
    }
    
    if (!transactionData || !transactionData.externalTransactionId) {
        throw new Error("Transaction data with externalTransactionId is required");
    }
    
    console.log("Execute result:", executeResult);
    
    // Create contract instance with the provided signer
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);
    
    // Format the payload for the contract
    const krnlPayload = {
        auth: executeResult.auth,
        kernelResponses: executeResult.kernel_responses,
        kernelParams: executeResult.kernel_params
    };
    
    // IMPORTANT: These parameters MUST match exactly what was used in the executeKrnl function
    // Extract the exact parameters that were used when generating the KRNL payload
    const externalTransactionId = transactionData.externalTransactionId;
    
    // Use the exact same amount that was used in the KRNL payload
    const amount = toWei(transactionData.transactionInfo.amount);
    
    // Get the beneficiary address - this must match what was encoded in the KRNL payload
    let beneficiary = transactionData.address;
    if (!beneficiary) {
        try {
            beneficiary = await signer.getAddress();
        } catch (error) {
            console.error("Failed to get signer address:", error);
            throw new Error("Could not determine beneficiary address");
        }
    }
    
    // Call the unstake function
    const tx = await contract.unstake(
        krnlPayload,
        externalTransactionId,
        amount,
        beneficiary
    );
    
    // Wait for the transaction to be mined
    await tx.wait();
    
    return tx.hash;
}

/**
 * Stake ETH in the contract
 * @param amount Amount of ETH to stake in ETH units (not wei)
 * @param signer The signer to use for the transaction
 * @returns Transaction hash
 */
export async function stakeEth(amount: string | number, signer: ethers.Signer) {
    if (!signer) {
        throw new Error("Signer is required");
    }
    
    if (!amount || parseFloat(amount.toString()) <= 0) {
        throw new Error("Amount must be greater than 0");
    }
    
    // Create contract instance with the provided signer
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);
    
    // Convert amount to wei
    const weiAmount = toWei(amount);
    
    // Call the stake function with the specified amount of ETH
    const tx = await contract.stake({
        value: weiAmount
    });
    
    // Wait for the transaction to be mined
    await tx.wait();
    
    return tx.hash;
}

/**
 * Get the staked balance for an address
 * @param address The address to check
 * @param provider The provider to use
 * @returns The staked balance in ETH (not wei)
 */
export async function getStakedBalance(address: string, provider: ethers.Provider) {
    if (!address) {
        throw new Error("Address is required");
    }
    
    if (!provider) {
        throw new Error("Provider is required");
    }
    
    // Create contract instance with the provided provider
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, provider);
    
    // Call the getStakerBalance function
    const balance = await contract.getStakerBalance(address);
    
    // Convert from wei to ETH
    return fromWei(balance);
}

/**
 * Get the total contract balance
 * @param provider The provider to use
 * @returns The contract balance in ETH (not wei)
 */
export async function getContractBalance(provider: ethers.Provider) {
    if (!provider) {
        throw new Error("Provider is required");
    }
    
    // Create contract instance with the provided provider
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, provider);
    
    // Call the getContractBalance function
    const balance = await contract.getContractBalance();
    
    // Convert from wei to ETH
    return fromWei(balance);
}