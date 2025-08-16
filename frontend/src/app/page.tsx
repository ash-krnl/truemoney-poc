"use client";

import { useState, useEffect } from 'react';
import { ethers } from 'krnl-sdk';
import { abi as contractAbi, CONTRACT_ADDRESS, KERNEL_ID } from '../components/kernels/offchain/1657/config';
import { 
  executeKrnl, 
  processMonitoredTransaction
} from '../components/kernels/offchain/1657';
import TrueMoneyMobile from '../components/TrueMoneyMobile';
import Image from 'next/image';
import { Montserrat } from 'next/font/google';
import { showErrorToast, showSuccessToast } from '../utils/toast';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

// Add TypeScript declaration for ethereum property on window
declare global {
  interface Window {
    ethereum?: any;
  }
}

const hexAdapter = (decimal: number) => {
  return ethers.toBeHex(decimal);
}

// Network configurations
const NETWORKS = {
  sepolia: {
    chainId: hexAdapter(11155111), // 11155111 in hex
    chainName: 'Sepolia',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://eth-sepolia.public.blastapi.io'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    iconColor: '#0052FF',
    icon: './sepolia.svg'
  },
};

export default function KrnlNextJSTemplate() {
  // State variables
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string>('');
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [step, setStep] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('sepolia');
  const [networkSwitchPending, setNetworkSwitchPending] = useState(false);
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false);
  
  // Section loading states
  const [responseLoading, setResponseLoading] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);
  
  // Token related states
  const [showTokenSection, setShowTokenSection] = useState(false);
  
  // Active tab state - default to token transfers
  const [activeTab, setActiveTab] = useState<'token'>('token');
  
  // Transaction logs state
  const [transactionLogs, setTransactionLogs] = useState<any[]>([]);

  // Handle transaction logs
  const handleTransactionLog = (log: any) => {
    setTransactionLogs(prev => [log, ...prev.slice(0, 9)]); // Keep only latest 10 logs
  };

  // These functions are already defined elsewhere in the file
  // We're removing the duplicate declarations
  
  // Check if wallet is connected
  useEffect(() => {
    checkWalletConnection();
  }, []);



  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#network-dropdown') && !target.closest('#network-button')) {
        setNetworkDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check if wallet is already connected
  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // Get provider
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);
        
        // Check if any accounts are already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
          const web3Signer = await web3Provider.getSigner();
          setSigner(web3Signer);
          setConnectedAddress(accounts[0]);
          setWalletConnected(true);
          
          // Check current network
          const network = await web3Provider.getNetwork();
          const chainIdHex = '0x' + network.chainId.toString(16);
          
          // Set the selected network based on the current chain ID
          for (const [networkName, networkConfig] of Object.entries(NETWORKS)) {
            if (networkConfig.chainId === chainIdHex) {
              setSelectedNetwork(networkName);
              break;
            }
          }
        }
      } catch (err) {
        console.error("Failed to check wallet connection:", err);
      }
    }
  };
  


  // Connect wallet using MetaMask or other providers
  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        setLoading(true);
        
        // Request accounts
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const web3Signer = await web3Provider.getSigner();
        
        setProvider(web3Provider);
        setSigner(web3Signer);
        setConnectedAddress(accounts[0]);
        setWalletConnected(true);
        showSuccessToast('Wallet connected');
        
        // Switch to the selected network after connecting
        await switchNetwork(selectedNetwork);
      } catch (err: any) {
        setError("Failed to connect wallet: " + err.message);
        showErrorToast("Failed to connect wallet: " + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setError("Ethereum wallet not found. Please install MetaMask or another wallet.");
      showErrorToast("Ethereum wallet not found. Please install MetaMask or another wallet.");
    }
  };
  
  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletConnected(false);
    setConnectedAddress('');
    setSigner(null);
    setResponse(null);
    setEventData(null);
    setTransactionHash('');
    setError('');
  };
  

  
  // Switch to a different network
  const switchNetwork = async (networkName: string) => {
    if (!window.ethereum) {
      setError("Ethereum wallet not found");
      return;
    }
    
    try {
      setNetworkSwitchPending(true);
      
      const network = NETWORKS[networkName as keyof typeof NETWORKS];
      if (!network) {
        throw new Error(`Network configuration not found for ${networkName}`);
      }
      
      try {
        // Try to switch to the network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: network.chainId }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: network.chainId,
                chainName: network.chainName,
                nativeCurrency: network.nativeCurrency,
                rpcUrls: network.rpcUrls,
                blockExplorerUrls: network.blockExplorerUrls
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
      
      setSelectedNetwork(networkName);
      setNetworkDropdownOpen(false);
      
      // Refresh provider and signer after network switch
      if (walletConnected) {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const web3Signer = await web3Provider.getSigner();
        setProvider(web3Provider);
        setSigner(web3Signer);
      }
    } catch (err: any) {
      setError(`Failed to switch network: ${err.message}`);
      showErrorToast(`Failed to switch network: ${err.message}`);
    } finally {
      setNetworkSwitchPending(false);
    }
  };



  // Get block explorer URL based on selected network
  const getBlockExplorerUrl = () => {
    const network = NETWORKS[selectedNetwork as keyof typeof NETWORKS];
    return network?.blockExplorerUrls[0] || 'https://sepolia.etherscan.io';
  };

  // Get network icon
  const getIcon = () => {
    return NETWORKS[selectedNetwork as keyof typeof NETWORKS]?.icon || './sepolia.svg';
  };

  // Get network name
  const getNetworkName = () => {
    return NETWORKS[selectedNetwork as keyof typeof NETWORKS]?.chainName || 'Sepolia';
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white relative overflow-x-hidden">
      {/* TrueMoney Background gradient effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/[0.08] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-600/[0.08] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-orange-500/[0.05] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* TrueMoney Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-orange-800/60 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* TrueMoney Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <div className="relative">
                  <Image src="/logotrue.webp" width={32} height={32} alt="TrueMoney Logo" />
                </div>
                <span className="text-white font-semibold">TrueMoney</span>
                <span className="text-orange-400 font-semibold">X</span>
                <Image src="/logo.svg" width={50} height={50} alt="KRNL Logo" />
                <span className="text-white font-semibold">KRNL</span>
              </h1>
            </div>
            
            {/* Network selector and wallet button */}
            <div className="flex items-center space-x-4">
              {/* Network Selector Dropdown */}
              <div className="relative">
                <button
                  id="network-button"
                  onClick={() => setNetworkDropdownOpen(!networkDropdownOpen)}
                  className="flex items-center px-4 py-2.5 rounded-xl bg-gray-900/70 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-200 border border-gray-700/50 hover:border-gray-600/60 group"
                >
                  <div className="p-1.5 bg-gray-800/70 rounded-lg mr-2 group-hover:bg-gray-700/70 transition-colors">
                    <Image src={getIcon()} width={16} height={16} alt="Network Icon" className="w-4 h-4" />
                  </div>
                  <span className="font-medium">{getNetworkName()}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 ml-2 group-hover:text-gray-300 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {networkDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-60 rounded-2xl overflow-hidden shadow-2xl bg-gray-900/95 backdrop-blur-xl ring-1 ring-gray-700/50 z-10 border border-gray-700/60">
                    <div className="py-2" role="menu" aria-orientation="vertical">
                      {Object.keys(NETWORKS).map((network) => (
                        <button
                          key={network}
                          onClick={() => switchNetwork(network)}
                          className={`block px-4 py-3 text-sm w-full text-left transition-all duration-200 hover:bg-gray-800/60 ${selectedNetwork === network ? 'bg-blue-900/40 text-white border-l-2 border-blue-500' : 'text-gray-300'}`}
                        >
                          <div className="flex items-center">
                            <div className="p-1.5 bg-gray-800/70 rounded-lg mr-3">
                              <Image src={(NETWORKS as any)[network].icon} width={16} height={16} alt={`${network} icon`} className="w-4 h-4" />
                            </div>
                            <span className="font-medium">{(NETWORKS as any)[network].chainName}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Connect wallet button */}
              {!walletConnected ? (
                <button 
                  onClick={connectWallet}
                  className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center shadow-lg shadow-orange-900/25 hover:shadow-orange-900/40 border border-orange-600/20 hover:scale-[1.02] group"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {networkSwitchPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      <span>Switching Network...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <span>Connect Wallet</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="relative group">
                  <div className="flex items-center bg-gray-900/80 backdrop-blur-sm border border-gray-700/60 px-4 py-2.5 rounded-xl shadow-lg hover:bg-gray-800/80 transition-all duration-200">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-3 shadow-sm shadow-emerald-400/60 animate-pulse"></div>
                    <span className="text-sm font-semibold truncate max-w-[120px] text-gray-100">
                      {connectedAddress.substring(0, 6)}...{connectedAddress.substring(connectedAddress.length - 4)}
                    </span>
                  </div>
                  <button 
                    onClick={disconnectWallet}
                    className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gradient-to-r from-red-600 to-red-700 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 text-sm font-semibold shadow-lg border border-red-500/30"
                  >
                    <span>Disconnect</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Full Screen Mobile Split Interface */}
        {walletConnected ? (
          <TrueMoneyMobile 
            connectedAddress={connectedAddress} 
            provider={provider} 
            signer={signer}
            onTransactionLog={handleTransactionLog}
          />
        ) : (
          <div className="text-center py-16 relative">
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-orange-600/5 to-red-600/5 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative inline-block mb-8">
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full opacity-60 blur-lg animate-pulse"></div>
              <div className="relative bg-gray-800/90 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-3xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">Wallet Not Connected</h3>
            <p className="text-gray-400 mb-10 max-w-md mx-auto text-lg leading-relaxed">Connect your wallet to start sending secure stablecoin transfers with TrueMoney's blockchain technology</p>
            
            <button 
              onClick={connectWallet}
              className="group relative overflow-hidden px-10 py-5 rounded-2xl font-semibold text-lg transition-all duration-300 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 shadow-2xl shadow-orange-900/30 hover:shadow-orange-900/50 hover:scale-105 flex items-center mx-auto border border-orange-500/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Connect Wallet
            </button>
          </div>
        )}

        {/* Enhanced Loading state */}
        {loading && !response && (
          <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-3xl shadow-2xl border border-gray-700/50 mb-12 p-12 backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 via-transparent to-red-600/5"></div>
            <div className="relative flex flex-col items-center justify-center">
              <div className="relative mb-8">
                <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative">
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-700 border-t-orange-500 shadow-lg"></div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 animate-pulse"></div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">{step}</div>
                <div className="mt-8 max-w-md w-full">
                  <div className="h-2 w-full bg-gray-800/60 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-400 transition-all duration-500 shadow-sm"
                      style={{ 
                        width: step.includes('confirmation') ? '90%' : 
                               step.includes('transaction') ? '70%' : 
                               step.includes('response') ? '50%' : 
                               step.includes('KRNL') ? '30%' : '10%' 
                      }}
                    ></div>
                  </div>
                  <div className="mt-3 text-sm text-gray-400 font-medium">
                    Processing your request securely...
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}