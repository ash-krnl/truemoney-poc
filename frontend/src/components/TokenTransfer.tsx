"use client";

import React, { useState, useEffect } from 'react';
import { ethers } from 'krnl-sdk';
import { executeTokenTransfer, processTokenTransfer, getTokenBalance } from './kernels/offchain/1657/tokenTransfer';
import { showErrorToast, showSuccessToast } from '../utils/toast';
import { toWei, executeKrnl } from './kernels/offchain/1657';

type TokenTransferProps = {
  connectedAddress: string;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
};

const TokenTransfer: React.FC<TokenTransferProps> = ({ connectedAddress, provider, signer }) => {
  // State variables
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferHash, setTransferHash] = useState<string>('');
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [transferStep, setTransferStep] = useState<string>('');
  const [balanceLoading, setBalanceLoading] = useState(false);
  
  // Fetch token balance on component load
  useEffect(() => {
    if (connectedAddress && provider) {
      fetchTokenBalance();
    }
  }, [connectedAddress, provider]);
  
  // Function to fetch token balance
  const fetchTokenBalance = async () => {
    try {
      setBalanceLoading(true);
      const balance = await getTokenBalance(connectedAddress, provider!);
      setTokenBalance(balance);
    } catch (error) {
      console.error("Error fetching token balance:", error);
    } finally {
      setBalanceLoading(false);
    }
  };
  
  
  // Handle token transfer
  const handleTokenTransfer = async () => {
    if (!signer) {
      showErrorToast("Please connect your wallet first");
      return;
    }
    
    if (!recipientAddress || !ethers.isAddress(recipientAddress)) {
      showErrorToast("Please enter a valid recipient address");
      return;
    }
    
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      showErrorToast("Please enter a valid amount");
      return;
    }
    
    try {
      setTransferLoading(true);
      setTransferStep('Preparing token transfer...');
      
      
      // Execute KRNL to get payload
      setTransferStep('Getting KRNL authorization...');
      console.log(connectedAddress, recipientAddress, transferAmount);
      const krnlPayload = await executeTokenTransfer(
        connectedAddress, 
        recipientAddress, 
        Number(transferAmount), 
      );

      console.log("KRNL payload:", krnlPayload);
      
      setTransferStep('Sending transaction to contract...');
      // Process token transfer with KRNL payload
      const txHash = await processTokenTransfer(
        krnlPayload,
        recipientAddress,
        Number(transferAmount),
        signer
      );
      
      setTransferHash(txHash);
      setTransferStep('Transaction confirmed!');
      showSuccessToast(`Token transfer successful: ${txHash.slice(0, 10)}...`);
      
      // Refresh token balance
      fetchTokenBalance();
      
    } catch (error: any) {
      console.error("Token transfer error:", error);
      showErrorToast(error.message || "Token transfer failed");
      setTransferStep('');
    } finally {
      setTransferLoading(false);
    }
  };
  
  return (
    <div className="p-6 bg-gray-800/90 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Transfer TrueMoney Tokens</h2>
      
      <div className="mb-4 p-3 bg-gray-50/10 rounded-md">
        <p className="font-medium">Your Token Balance: {balanceLoading ? 'Loading...' : `${tokenBalance} TM`}</p>
      </div>
      
      <div className="mb-4">
        <label className="block text-white mb-2">Recipient Address</label>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0x..."
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          disabled={transferLoading}
        />
      </div>
      
      <div className="mb-6">
        <label className="block text-white mb-2">Amount</label>
        <div className="flex items-center">
          <input
            type="number"
            className="flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.0"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            disabled={transferLoading}
            step="0.0001"
            min="0"
          />
          <span className="px-3 py-2 bg-gray-100/10 border border-l-0 rounded-r-md">TM</span>
        </div>
      </div>
      
      <button
        className={`w-full py-3 font-bold rounded-md transition ${
          transferLoading
            ? 'bg-blue-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        onClick={handleTokenTransfer}
        disabled={transferLoading}
      >
        {transferLoading ? transferStep || 'Processing...' : 'Transfer Tokens'}
      </button>
      
      {transferHash && (
        <div className="mt-4 p-4 bg-green-50/10 rounded-md">
          <p className="text-green-800">
            Transaction successful! Hash: 
            <span className="font-mono ml-2 break-all">{transferHash}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default TokenTransfer;
