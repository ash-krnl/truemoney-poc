"use client";

import { ethers } from "krnl-sdk";
import { abi as contractAbi, CONTRACT_ADDRESS, ENTRY_ID, ACCESS_TOKEN, KERNEL_ID } from "./config";
import { toWei, fromWei } from "./index";

/**
 * Execute KRNL with token transfer parameters
 * @param sender Sender wallet address 
 * @param recipient Recipient wallet address
 * @param amount Amount of tokens to transfer
 * @param transactionData The transaction data to monitor
 * @returns KRNL payload result
 */
export async function executeTokenTransfer(sender: string, recipient: string, amount: number) {
    // Validate required parameters
    if (!sender || !recipient) {
        throw new Error("Sender and recipient addresses are required");
    }
    
    if (!amount || amount <= 0) {
        throw new Error("Amount must be greater than 0");
    }
    
    // Create KRNL provider
    const krnlProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_KRNL);
    
    // Use provided kernel ID or default to environment variable
    const kernelId = KERNEL_ID;
    
    // Generate a unique transaction ID using timestamp and random string
    const uniqueTransactionId =  
        `tx-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Get the amount from transaction data
    const transactionAmount = amount;
    
    // Create the kernel request data with the correct structure for ComPilot
    const kernelRequestData = {
        senderAddress: sender,
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
                            "amount": 0.5,
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
    };
    
    // Encode the parameters for the contract function
    // These are the parameters that will be verified by the onlyAuthorized modifier
    const abiCoder = new ethers.AbiCoder();
    const functionParams = abiCoder.encode(
        ["address", "uint256"], 
        [
            recipient, // to address
            toWei(transactionAmount) // amount in wei
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
 * Process a token transfer with KRNL verification
 * @param executeResult The result from executeTokenTransfer
 * @param recipient The recipient address
 * @param amount Amount of tokens to transfer
 * @param signer The signer to use for the transaction
 * @returns Transaction hash
 */
export async function processTokenTransfer(executeResult: any, recipient: string, amount: number, signer: ethers.Signer) {
    if (!signer) {
        throw new Error("Signer is required");
    }
    
    if (!recipient) {
        throw new Error("Recipient address is required");
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
    
    // Convert amount to wei
    const tokenAmount = toWei(amount);
    
    // Call the transferWithKRNL function
    const tx = await contract.transferWithKRNL(
        recipient,
        tokenAmount,
        krnlPayload
    );
    
    // Wait for the transaction to be mined
    await tx.wait();
    
    return tx.hash;
}

/**
 * Process a token transferFrom with KRNL verification
 * @param executeResult The result from executeTokenTransfer
 * @param from The address to transfer from
 * @param recipient The recipient address
 * @param amount Amount of tokens to transfer
 * @param signer The signer to use for the transaction
 * @returns Transaction hash
 */
export async function processTokenTransferFrom(executeResult: any, from: string, recipient: string, amount: number, signer: ethers.Signer) {
    if (!signer) {
        throw new Error("Signer is required");
    }
    
    if (!from || !recipient) {
        throw new Error("From and recipient addresses are required");
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
    
    // Convert amount to wei
    const tokenAmount = toWei(amount);
    
    // Call the transferFromWithKRNL function
    const tx = await contract.transferFromWithKRNL(
        from,
        recipient,
        tokenAmount,
        krnlPayload
    );
    
    // Wait for the transaction to be mined
    await tx.wait();
    
    return tx.hash;
}

/**
 * Get token balance for an address
 * @param address The address to check
 * @param provider The provider to use
 * @returns The token balance
 */
export async function getTokenBalance(address: string, provider: ethers.Provider) {
    if (!address) {
        throw new Error("Address is required");
    }
    
    if (!provider) {
        throw new Error("Provider is required");
    }
    
    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, provider);

    console.log("Address:", address);
    
    // Call the balanceOf function
    const balance = await contract.balanceOf(address);

    console.log("Balance:", balance);
    
    // Return the formatted balance
    return fromWei(balance);
}
