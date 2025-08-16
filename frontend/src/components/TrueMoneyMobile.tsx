"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { ethers } from 'krnl-sdk';
import { executeTokenTransfer, processTokenTransfer, getTokenBalance } from './kernels/offchain/1657/tokenTransfer';
import { showErrorToast, showSuccessToast, showInfoToast } from '../utils/toast';
import { 
  MobileFrame,
  SenderMobileFrame,
  IOSNotificationBanner,
  QuickAmountButtons, 
  TransferButton, 
  UserProfileHeader,
  InputField,
  AppIcon 
} from './shared/MobileComponents';

type TrueMoneyMobileProps = {
  connectedAddress: string;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  onTransactionLog?: (log: any) => void;
};

const TrueMoneyMobile: React.FC<TrueMoneyMobileProps> = ({ connectedAddress, provider, signer, onTransactionLog }) => {
  // State variables
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferHash, setTransferHash] = useState<string>('');
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [transferStep, setTransferStep] = useState<string>('');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [receiverBalance, setReceiverBalance] = useState<string>('0');
  const [receiverBalanceLoading, setReceiverBalanceLoading] = useState(false);
  const [showTransferSuccess, setShowTransferSuccess] = useState(false);
  const [showReceiverNotification, setShowReceiverNotification] = useState(false);
  // Snapshot of amount to display in notification
  const [notifAmount, setNotifAmount] = useState<string>('');

  // Howler sound instance for iOS-like tri-tone (file in public as /ios-tritone.mp3)
  const tritoneRef = useRef<Howl | null>(null);
  // Gate to avoid double-showing the notification
  const notificationActiveRef = useRef<boolean>(false);
  // Track last transaction hash we notified for
  const lastNotifiedTxRef = useRef<string | null>(null);
  // Snapshot the last confirmed amount to use in effect
  const lastConfirmedAmountRef = useRef<string>('');
  // Ensure we only start audio once per notification
  const audioPlayedForThisNotifRef = useRef<boolean>(false);
  // Exit animation state for notification
  const [isNotifExiting, setIsNotifExiting] = useState(false);
  // Controls enter/exit transition state to avoid flicker
  const [notifEntered, setNotifEntered] = useState(false);

  const showNotification = (amount: string) => {
    if (notificationActiveRef.current) return;
    setNotifAmount(amount);
    notificationActiveRef.current = true;
    setShowReceiverNotification(true);
  };

  // Initialize Howler sound on mount
  useEffect(() => {
    tritoneRef.current = new Howl({
      src: ['/ios-tritone.mp3'],
      preload: true,
      html5: true,
      volume: 1.0,
    });
    return () => {
      tritoneRef.current?.unload();
      tritoneRef.current = null;
    };
  }, []);

  // Play the tritone audio whenever the notification is shown (once per banner)
  useEffect(() => {
    if (!showReceiverNotification) return;
    const sound = tritoneRef.current;
    if (!sound) return;
    if (audioPlayedForThisNotifRef.current) return;
    audioPlayedForThisNotifRef.current = true;
    // ensure clean start
    try {
      sound.stop();
    } catch {}
    sound.play();
    return () => {
      // When banner hides (dependency changes), allow future plays
      audioPlayedForThisNotifRef.current = false;
    };
  }, [showReceiverNotification]);

  // When showing notification, trigger enter transition after mount
  useEffect(() => {
    if (showReceiverNotification) {
      setIsNotifExiting(false);
      setNotifEntered(false);
      // Wait a tick to allow initial styles to apply, then enter
      const id = requestAnimationFrame(() => setNotifEntered(true));
      return () => cancelAnimationFrame(id);
    } else {
      setNotifEntered(false);
    }
  }, [showReceiverNotification]);

  // Separate auto-hide for the notification banner
  useEffect(() => {
    if (!showReceiverNotification) return;
    const hideAfterMs = 4500;
    const t = setTimeout(() => {
      // Trigger exit transition first, then unmount
      setNotifEntered(false);
      setIsNotifExiting(true);
      const exitDuration = 300; // ms, keep in sync with transition duration
      setTimeout(() => {
        setShowReceiverNotification(false);
        setIsNotifExiting(false);
        notificationActiveRef.current = false;
      }, exitDuration);
    }, hideAfterMs);
    return () => clearTimeout(t);
  }, [showReceiverNotification]);

  // Guarded effect: show notification once when transferHash is set
  useEffect(() => {
    if (!transferHash) return;
    if (lastNotifiedTxRef.current === transferHash) return;
    lastNotifiedTxRef.current = transferHash;
    showNotification(lastConfirmedAmountRef.current || transferAmount);
  }, [transferHash]);

  // Mock user data
  const senderUser = {
    name: "Nattapong Pongpipat",
    avatar: "NP",
    phone: "+66 92 123 4567"
  };

  const receiverUser = {
    name: "Pimchanok Leelasettakorn", 
    avatar: "PL",
    phone: "+66 87 654 3210"
  };

  // Fetch balances on component load
  useEffect(() => {
    if (connectedAddress && provider) {
      fetchSenderBalance();
    }
  }, [connectedAddress, provider]);

  // Fetch receiver balance when recipient address changes
  useEffect(() => {
    if (recipientAddress && ethers.isAddress(recipientAddress) && provider) {
      fetchReceiverBalance();
    } else {
      setReceiverBalance('0');
    }
  }, [recipientAddress, provider]);

  // Function to fetch sender token balance
  const fetchSenderBalance = async () => {
    try {
      setBalanceLoading(true);
      const balance = await getTokenBalance(connectedAddress, provider!);
      setTokenBalance(balance);
    } catch (error) {
      console.error("Error fetching sender balance:", error);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Function to fetch receiver token balance
  const fetchReceiverBalance = async () => {
    try {
      setReceiverBalanceLoading(true);
      const balance = await getTokenBalance(recipientAddress, provider!);
      setReceiverBalance(balance);
    } catch (error) {
      console.error("Error fetching receiver balance:", error);
      setReceiverBalance('0');
    } finally {
      setReceiverBalanceLoading(false);
    }
  };

  // Show step-by-step toast notifications
  const showStepToast = (step: string) => {
    setTransferStep(step);
    showInfoToast(step);
    
    // Log to parent component
    if (onTransactionLog) {
      onTransactionLog({
        timestamp: new Date().toISOString(),
        step: step,
        status: 'processing'
      });
    }
  };

  // Handle token transfer with detailed step notifications
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
      setShowTransferSuccess(false);
      // Do not force-hide notification here; guarded effect will handle showing once per tx
      
      // Step 1: Preparing transfer
      showStepToast('🔄 Preparing transfer...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Getting KRNL authorization
      showStepToast('🔐 Getting KRNL authorization...');
      const krnlPayload = await executeTokenTransfer(
        connectedAddress, 
        recipientAddress, 
        Number(transferAmount), 
      );

      console.log("KRNL payload:", krnlPayload);
      
      if (onTransactionLog) {
        onTransactionLog({
          timestamp: new Date().toISOString(),
          step: 'KRNL Payload Generated',
          status: 'success',
          data: krnlPayload
        });
      }
      
      // Step 3: Processing transaction
      showStepToast('📤 Sending transaction...');
      const txHash = await processTokenTransfer(
        krnlPayload,
        recipientAddress,
        Number(transferAmount),
        signer
      );
      
      // Step 4: Transaction confirmed (snapshot amount, then set hash; notification handled by effect)
      lastConfirmedAmountRef.current = transferAmount;
      setTransferHash(txHash);
      
      if (onTransactionLog) {
        onTransactionLog({
          timestamp: new Date().toISOString(),
          step: 'Transaction Successful',
          status: 'success',
          data: { txHash, amount: transferAmount, recipient: recipientAddress }
        });
      }      
      // Refresh balances
      fetchSenderBalance();
      fetchReceiverBalance();
      
      // Keep form values after success; optionally clear transient UI flags only
      setTimeout(() => {
        setShowTransferSuccess(false);
        setTransferStep('');
      }, 5000);

      // Auto-hide now handled by audio end listener / synth fallback timer
      
    } catch (error: any) {
      console.error("Token transfer error:", error);
      showErrorToast(error.message || "Transfer failed");
      setTransferStep('');
      
      if (onTransactionLog) {
        onTransactionLog({
          timestamp: new Date().toISOString(),
          step: 'Transaction Failed',
          status: 'error',
          error: error.message
        });
      }
    } finally {
      setTransferLoading(false);
    }
  };


  // Sender Mobile Interface
  const SenderMobile = () => (
    <SenderMobileFrame frameSize={{ width: 453, height: 912 }}>
      <div className="h-full w-full bg-gradient-to-b from-orange-500 to-red-500 relative">
        {/* User Profile Header */}
        <div className="px-6 pt-16 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold">{senderUser.avatar}</span>
                </div>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">{senderUser.name}</h2>
                <p className="text-orange-100 text-sm">{senderUser.phone}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-orange-100 text-xs">Balance</p>
              <p className="text-white font-bold text-lg">
                {balanceLoading ? '...' : `₿${tokenBalance}`}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-3xl mx-4 px-6 py-8 overflow-hidden">
          <div className="space-y-6 h-full">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Send Money</h3>
              <p className="text-gray-600">Transfer to another TrueMoney wallet</p>
            </div>

            <InputField
              label="To"
              placeholder="Enter wallet address"
              value={recipientAddress}
              onChange={setRecipientAddress}
              disabled={transferLoading}
              className="text-sm text-black"
            />

            {recipientAddress && ethers.isAddress(recipientAddress) && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">{receiverUser.avatar}</span>
                </div>
                <span className="text-green-700 font-medium">{receiverUser.name}</span>
              </div>
            )}

            <InputField
              label="Amount"
              placeholder="0.00"
              value={transferAmount}
              onChange={setTransferAmount}
              disabled={transferLoading}
              prefix="₿"
              type="number"
              className="text-xl font-bold text-black"
            />

            <QuickAmountButtons
              amounts={['10', '50', '100']}
              onAmountSelect={setTransferAmount}
              disabled={transferLoading}
            />

            <TransferButton
              onClick={handleTokenTransfer}
              loading={transferLoading}
              disabled={transferLoading || !recipientAddress || !transferAmount}
              loadingText={transferStep || 'Processing...'}
            >
              Send Money
            </TransferButton>
          </div>
        </div>
      </div>
    </SenderMobileFrame>
  );


  // Receiver Mobile Interface
  const ReceiverMobile = () => (
    <div className="relative">
      <MobileFrame frameSize={{ width: 453, height: 912 }}>
        <div className="relative h-full w-full">
          <img 
            src="/Iphone_home.png" 
            alt="iPhone Home Screen"
            className="w-full h-full object-cover"
          />
        </div>
        {/* Notification Bar Overlay with smooth transitions */}
        {(showReceiverNotification || isNotifExiting) && (
          <div
            className={`absolute top-15 left-3 right-3 transition-all duration-300 ease-in-out ${
              notifEntered ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
            }`}
          >
            <IOSNotificationBanner
              title="TrueMoney"
              message={`₿${notifAmount || '0'} received from ${senderUser.name}`}
              avatarSrc="/logotrue.webp"
              timestampText="now"
              mode="light"
              blur={48}
              opacity={0.58}
              saturate={2.5}
              contrast={1.06}
              borderOpacity={0.20}
            />
          </div>
        )}
      </MobileFrame>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Split Screen Container */}
      <div className="flex items-center justify-center space-x-8 max-w-7xl mx-auto">
        {/* Sender Side */}
        <div className="flex flex-col items-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Sender</h2>
          </div>
          <SenderMobile />
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-px h-32 bg-gradient-to-b from-transparent via-orange-500 to-transparent"></div>
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div className="w-px h-32 bg-gradient-to-b from-transparent via-red-500 to-transparent"></div>
        </div>

        {/* Receiver Side */}
        <div className="flex flex-col items-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Receiver</h2>
          </div>
          <ReceiverMobile />
        </div>
      </div>
    </div>
  );
};

export default TrueMoneyMobile;
