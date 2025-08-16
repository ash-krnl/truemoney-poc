// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/ERC20.sol";
import "../src/KRNL.sol";

contract TestTokenTransfer is Script {
    // Webhook response structure matching the contract
    struct WebhookResponse {
        string eventType; // "transaction.updated"
        WebhookPayload payload;
    }

    // The main payload with transaction decision - Fields in alphabetical order
    struct WebhookPayload {
        string createdAt;           // ISO format timestamp
        string customerId;          // UUID format
        string externalTransactionId; // Your original transaction ID
        string id;                  // Review ID
        string reason;              // Reason for the decision
        string riskLevel;           // "Low", "Medium", "High"
        uint256 riskScore;          // Risk score (0 if null/not available)
        string status;              // "pending", "approved", "rejected", "under_review"
        string transactionDate;     // ISO format timestamp
        string transactionId;       // ComPilot transaction ID
        string transactionType;     // "crypto" or "fiat"
        string updatedAt;           // ISO format timestamp
        string workspaceId;         // Workspace identifier
    }

    // Test case structure
    struct TestCase {
        string name;
        string status;
        string riskLevel;
        string reason;
        uint256 riskScore;
        bool expectedApproval;
    }

    // Main function to run the test script
    function run() external {
        console.log("\n=== Token Transfer Contract Test Script ===");
        console.log("This script generates test payloads for TokenContract and simulates transfer verification outcomes");
        
        // Run test cases
        runTestCases();
        
        // Show how to use the script
        console.log("\n=== Usage Instructions ===");
        console.log("To test with a specific KRNL payload:");
        console.log("forge script script/TestTokenTransfer.s.sol:TestTokenTransfer --sig \"decodeTokenTransferPayload(bytes)\" <your_hex_data> -vvv");
    }

    // Run predefined test cases
    function runTestCases() public {
        console.log("\n=== Running Test Cases ===");
        
        // Define test cases
        TestCase[] memory testCases = new TestCase[](5);
        
        // Generate dynamic external transaction IDs for each test
        string memory externalTxId1 = generateExternalTransactionId("test1");
        string memory externalTxId2 = generateExternalTransactionId("test2");
        string memory externalTxId3 = generateExternalTransactionId("test3");
        string memory externalTxId4 = generateExternalTransactionId("test4");
        string memory externalTxId5 = generateExternalTransactionId("test5");
        
        // Approved transaction - should pass
        testCases[0] = TestCase({
            name: "Approved Low Risk Transfer",
            status: "approved",
            riskLevel: "Low",
            reason: "Transaction approved after risk assessment",
            riskScore: 15,
            expectedApproval: true
        });
        
        // Approved medium risk - should pass
        testCases[1] = TestCase({
            name: "Approved Medium Risk Transfer",
            status: "approved",
            riskLevel: "Medium",
            reason: "Transaction approved with enhanced monitoring",
            riskScore: 45,
            expectedApproval: true
        });
        
        // Rejected high risk - should fail
        testCases[2] = TestCase({
            name: "Rejected High Risk Transfer",
            status: "rejected",
            riskLevel: "High",
            reason: "High risk indicators detected - transaction blocked",
            riskScore: 85,
            expectedApproval: false
        });
        
        // Under review - should fail
        testCases[3] = TestCase({
            name: "Under Review Transfer",
            status: "under_review",
            riskLevel: "Medium",
            reason: "Transaction requires manual review",
            riskScore: 55,
            expectedApproval: false
        });
        
        // Pending - should fail
        testCases[4] = TestCase({
            name: "Pending Transfer",
            status: "pending",
            riskLevel: "Low",
            reason: "Awaiting risk assessment completion",
            riskScore: 0,
            expectedApproval: false
        });
        
        // Run each test case
        for (uint i = 0; i < testCases.length; i++) {
            TestCase memory tc = testCases[i];
            console.log("\n--- Test Case:", tc.name, "---");
            
            // Generate dynamic external transaction ID for this test
            string memory dynamicExternalTxId = generateExternalTransactionId(tc.name);
            
            // Generate test payload
            bytes memory payload = generateTestPayload(
                tc.status,
                tc.riskLevel,
                tc.reason,
                tc.riskScore,
                dynamicExternalTxId
            );
            
            // Analyze the payload
            analyzeTokenTransferPayload(payload, tc.expectedApproval);
        }
    }

    // Generate a dynamic external transaction ID
    function generateExternalTransactionId(string memory testName) public view returns (string memory) {
        return string(abi.encodePacked("tx-", block.timestamp, "-", testName));
    }

    // Generate a test KRNL payload for token transfer
    function generateTestPayload(
        string memory status,
        string memory riskLevel,
        string memory reason,
        uint256 riskScore,
        string memory externalTransactionId
    ) public pure returns (bytes memory) {
        // Create WebhookPayload
        WebhookPayload memory payload = WebhookPayload({
            createdAt: "2024-01-15T10:30:00Z",
            customerId: "78d29773-8aa6-4b33-aa53-2ffca3adbe7e",
            externalTransactionId: externalTransactionId,
            id: "review-456789",
            reason: reason,
            riskLevel: riskLevel,
            riskScore: riskScore,
            status: status,
            transactionDate: "2024-01-15T10:30:00Z",
            transactionId: "compilot-tx-789",
            transactionType: "crypto",
            updatedAt: "2024-01-15T10:35:00Z",
            workspaceId: "workspace-123"
        });
        
        // Create WebhookResponse
        WebhookResponse memory response = WebhookResponse({
            eventType: "transaction.updated",
            payload: payload
        });
        
        // Create kernel response with ComPilot data
        KernelResponse[] memory kernelResponses = new KernelResponse[](1);
        kernelResponses[0].kernelId = 1657; // Using the kernel ID from your config
        kernelResponses[0].result = abi.encode(response);
        kernelResponses[0].err = "";
        
        // Encode the kernel responses array
        bytes memory encodedResponses = abi.encode(kernelResponses);
        
        return encodedResponses;
    }

    // Decode and analyze a token transfer payload
    function decodeTokenTransferPayload(bytes memory encodedData) external {
        analyzeTokenTransferPayload(encodedData, true);
    }

    // Analyze a token transfer payload and check verification outcome
    function analyzeTokenTransferPayload(bytes memory encodedData, bool expectedApproval) public {
        console.log("\n=== Token Transfer Payload Analysis ===");
        console.log("Encoded data length:", encodedData.length);
        
        // Decode the KRNL response array
        KernelResponse[] memory kernelResponses = abi.decode(encodedData, (KernelResponse[]));
        console.log("Number of kernel responses:", kernelResponses.length);
        
        // Look for ComPilot kernel (ID 1657 as used in your config)
        bool webhookFound = false;
        
        for (uint i = 0; i < kernelResponses.length; i++) {
            console.log("Kernel", i, "ID:", kernelResponses[i].kernelId);
            console.log("Kernel", i, "result length:", kernelResponses[i].result.length);
            
            // Check if this is the ComPilot kernel
            if (kernelResponses[i].kernelId == 1657) {
                webhookFound = true;
                console.log("Found ComPilot kernel at index", i);
                
                // Decode the webhook response
                decodeWebhookResult(kernelResponses[i].result, expectedApproval);
                break;
            }
        }
        
        if (!webhookFound) {
            console.log("ComPilot kernel not found (ID 1657)");
            console.log("Available kernel IDs:");
            for (uint i = 0; i < kernelResponses.length; i++) {
                console.log("  -", kernelResponses[i].kernelId);
            }
        }
    }

    // Decode webhook result and simulate token contract verification
    function decodeWebhookResult(bytes memory webhookData, bool expectedApproval) public view {
        console.log("\n=== Webhook Response Decode ===");
        console.log("Webhook data length:", webhookData.length);
        
        // Decode the webhook response
        WebhookResponse memory response = abi.decode(webhookData, (WebhookResponse));
        
        console.log("\n=== Decoded Webhook Response ===");
        console.log("Event Type:", response.eventType);
        console.log("Status:", response.payload.status);
        console.log("Risk Level:", response.payload.riskLevel);
        console.log("Risk Score:", response.payload.riskScore);
        console.log("Reason:", response.payload.reason);
        console.log("Transaction ID:", response.payload.transactionId);
        console.log("External Transaction ID:", response.payload.externalTransactionId);
        console.log("Customer ID:", response.payload.customerId);
        
        // Simulate token contract verification logic
        bool isAllowed = simulateTokenTransferVerification(response.payload);
        
        console.log("\n=== Token Transfer Verification Simulation ===");
        console.log("Is Transfer Allowed:", isAllowed);
        
        if (isAllowed) {
            console.log("APPROVED: Token transfer can proceed");
            console.log("Risk Assessment: Transaction passed compliance checks");
        } else {
            console.log("REJECTED: Token transfer blocked");
            console.log("Reason:", response.payload.reason);
        }
        
        // Check if outcome matches expected approval
        console.log("\n=== Test Outcome ===");
        if (isAllowed == expectedApproval) {
            console.log("[PASS] TEST PASSED: Transfer outcome matches expected result");
        } else {
            console.log("[FAIL] TEST FAILED: Transfer outcome does not match expected result");
            console.log("  Expected:", expectedApproval);
            console.log("  Actual:", isAllowed);
        }
    }

    // Simulate token contract verification logic
    function simulateTokenTransferVerification(WebhookPayload memory payload) public pure returns (bool) {
        // This replicates the verification logic that would be in TokenContract.checkTransferAllowed
        
        // Only approved transactions are allowed
        if (keccak256(bytes(payload.status)) != keccak256(bytes("approved"))) {
            return false;
        }
        
        // Additional risk level checks (optional)
        if (keccak256(bytes(payload.riskLevel)) == keccak256(bytes("High"))) {
            // Even if approved, we might want to block high risk
            // This depends on your business logic
            return false;
        }
        
        // Check risk score threshold (optional)
        if (payload.riskScore > 90) {
            return false;
        }
        
        return true;
    }

    // Generate a complete mock KrnlPayload for TokenContract.transferWithKRNL
    function generateMockKrnlPayload(
        string memory status,
        string memory riskLevel,
        string memory reason,
        uint256 riskScore
    ) public view returns (KrnlPayload memory) {
        // Generate dynamic external transaction ID
        string memory dynamicExternalTxId = generateExternalTransactionId("mock");
        
        // Create WebhookPayload
        WebhookPayload memory payload = WebhookPayload({
            createdAt: "2024-01-15T10:30:00Z",
            customerId: "78d29773-8aa6-4b33-aa53-2ffca3adbe7e",
            externalTransactionId: dynamicExternalTxId,
            id: "review-456789",
            reason: reason,
            riskLevel: riskLevel,
            riskScore: riskScore,
            status: status,
            transactionDate: "2024-01-15T10:30:00Z",
            transactionId: "compilot-tx-789",
            transactionType: "crypto",
            updatedAt: "2024-01-15T10:35:00Z",
            workspaceId: "workspace-123"
        });
        
        // Create WebhookResponse
        WebhookResponse memory response = WebhookResponse({
            eventType: "transaction.updated",
            payload: payload
        });
        
        // Create kernel response with webhook data
        KernelResponse[] memory kernelResponses = new KernelResponse[](1);
        kernelResponses[0].kernelId = 1657;
        kernelResponses[0].result = abi.encode(response);
        kernelResponses[0].err = "";
        
        // Encode the kernel responses array
        bytes memory encodedResponses = abi.encode(kernelResponses);
        
        // Mock kernel parameters (these would normally come from KRNL)
        bytes memory kernelParams = abi.encode(address(0x742d35cc6634c0532925A3B8d8c3C4D8e6C8a8c8), uint256(100 * 10**18));
        
        // Mock auth data (this would normally be signed by TokenAuthority)
        bytes memory auth = bytes("mock_auth_data");
        
        // Create the full KrnlPayload
        KrnlPayload memory krnlPayload = KrnlPayload({
            auth: auth,
            kernelResponses: encodedResponses,
            kernelParams: kernelParams
        });
        
        return krnlPayload;
    }

    // Simulate TokenContract.transferWithKRNL parameters
    function simulateTransferWithKRNLParams() public pure returns (
        address to,
        uint256 amount
    ) {
        return (
            address(0x742d35cc6634c0532925A3B8d8c3C4D8e6C8a8c8),
            100 * 10**18 // 100 tokens
        );
    }

    // Encode function parameters for TokenContract.transferWithKRNL
    function encodeTransferWithKRNLParams(
        address to,
        uint256 amount
    ) public pure returns (bytes memory) {
        return abi.encode(to, amount);
    }

    // Test the complete flow with different scenarios
    function testCompleteFlow() public {
        console.log("\n=== Complete Flow Test ===");
        
        // Test approved transfer
        console.log("\n--- Testing Approved Transfer ---");
        KrnlPayload memory approvedPayload = generateMockKrnlPayload(
            "approved",
            "Low",
            "Transaction approved after risk assessment",
            15
        );
        
        (address to, uint256 amount) = simulateTransferWithKRNLParams();
        console.log("Transfer to:", to);
        console.log("Amount:", amount);
        
        // In a real scenario, you would call:
        // tokenContract.transferWithKRNL(to, amount, approvedPayload);
        console.log("Would call: transferWithKRNL(to, amount, krnlPayload)");
        
        // Test rejected transfer
        console.log("\n--- Testing Rejected Transfer ---");
        KrnlPayload memory rejectedPayload = generateMockKrnlPayload(
            "rejected",
            "High",
            "High risk indicators detected - transaction blocked",
            85
        );
        
        console.log("Would call: transferWithKRNL(to, amount, krnlPayload)");
        console.log("Expected result: Transaction should revert");
    }
}
