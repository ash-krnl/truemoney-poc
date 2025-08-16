import express, { Request, Response } from 'express';
import cors from 'cors';
import { body, param, validationResult } from 'express-validator';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Chainalysis API configuration
const CHAINALYSIS_BASE_URL = process.env.CHAINALYSIS_BASE_URL || 'https://api.chainalysis.com';
const CHAINALYSIS_API_TOKEN = process.env.CHAINALYSIS_API_TOKEN;

// Check if API token is configured
if (!CHAINALYSIS_API_TOKEN) {
  console.error('Error: CHAINALYSIS_API_TOKEN is not set. API token is required.');
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  exposedHeaders: ['ngrok-skip-browser-warning']
}));
app.use(express.json());

// Add ngrok-skip-browser-warning header to all responses
app.use((req, res, next) => {
  res.set({
    'ngrok-skip-browser-warning': 'true',
    'X-Content-Type-Options': 'nosniff'
  });
  next();
});

// Types based on Chainalysis API documentation
interface RiskAssessment {
  address: string;
  risk: 'Low' | 'Medium' | 'High' | 'Severe';
  riskReason?: string;
  addressType: 'PRIVATE_WALLET' | 'LIQUIDITY_POOL';
  cluster?: {
    category: string;
    name: string;
  };
  addressIdentifications: Array<{
    category: string;
    name: string;
    description?: string;
    url?: string;
    tags?: string[];
    addresses?: string[];
  }>;
  exposures: Array<{
    category: string;
    categoryId: string;
    value: number;
    valueUsd?: number;
  }>;
  triggers: Array<{
    category: string;
    categoryId: string;
    value: number;
    valueUsd?: number;
  }>;
  status: 'COMPLETE' | 'IN_PROGRESS' | 'PENDING';
  poolMetadata?: {
    tokenA: string;
    tokenB: string;
    protocol: string;
  };
}

// Validation middleware
const validateAddress = [
  param('address')
    .isLength({ min: 40, max: 42 })
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format')
];

// Helper to rename top-level 'address' to 'walletAddress'
const renameTopAddressKey = (data: any): any => {
  if (data && typeof data === 'object' && !Array.isArray(data) && 'address' in data) {
    const { address, ...rest } = data as any;
    return { walletAddress: address, ...rest };
  }
  return data;
};

// Filter the Chainalysis response down to only the fields we care about
const filterRiskFields = (data: any): { walletAddress: string; risk: string; riskReason?: string; status: string } => {
  const renamed = renameTopAddressKey(data);
  const { walletAddress, risk, riskReason, status } = renamed as any;
  return { walletAddress, risk, riskReason, status };
};

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// POST endpoint that forwards to Chainalysis API
app.post('/api/risk/v2/entities', [
  body('address')
    .isLength({ min: 40, max: 42 })
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format')
], async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid address format',
        details: errors.array()
      });
    }

    const { address } = req.body;
    
    // Forward the request to the Chainalysis API
    console.log(`[POST] Forwarding request to Chainalysis API for address: ${address}`);
    const apiUrl = `${CHAINALYSIS_BASE_URL}/api/risk/v2/entities/${address}`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Token': CHAINALYSIS_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    // Process the response to handle null values
    const processValue = (value: any): any => {
      if (value === null) {
        return "null";
      } else if (Array.isArray(value)) {
        return value.map(processValue);
      } else if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(
          Object.entries(value).map(([key, val]) => [key, processValue(val)])
        );
      }
      return value;
    };
    
    const processedData = processValue(response.data);
    return res.json(filterRiskFields(processedData));
  } catch (error: any) {
    console.error('Error processing risk assessment:', error);
    
    // Handle Chainalysis API errors
    if (error.response) {
      const statusCode = error.response.status || 500;
      return res.status(statusCode).json({
        error: error.response.data.error || 'API Error',
        message: error.response.data.message || 'Failed to process risk assessment',
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process risk assessment',
      timestamp: new Date().toISOString()
    });
  }
});

// Original GET endpoint - forwards requests to the Chainalysis API
app.get('/api/risk/v2/entities/:address', validateAddress, async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid address format',
        details: errors.array()
      });
    }

    const { address } = req.params;
    
    // Forward the request to the Chainalysis API
    console.log(`Forwarding request to Chainalysis API for address: ${address}`);
    const apiUrl = `${CHAINALYSIS_BASE_URL}/api/risk/v2/entities/${address}`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Token': CHAINALYSIS_API_TOKEN
      }
    });
    
    // Process the response to handle null values
    const processValue = (value: any): any => {
      if (value === null) {
        return "null";
      } else if (Array.isArray(value)) {
        return value.map(processValue);
      } else if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(
          Object.entries(value).map(([key, val]) => [key, processValue(val)])
        );
      }
      return value;
    };
    
    const processedData = processValue(response.data);
    return res.json(filterRiskFields(processedData));
  } catch (error: any) {
    console.error('Error processing risk assessment:', error);
    
    // Handle Chainalysis API errors
    if (error.response) {
      const statusCode = error.response.status || 500;
      return res.status(statusCode).json({
        error: error.response.data.error || 'API Error',
        message: error.response.data.message || 'Failed to process risk assessment',
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process risk assessment',
      timestamp: new Date().toISOString()
    });
  }
});

// Process batch results with null handling
const processBatchResults = (results: any[]) => {
  return results.map(result => {
    if (result.error) {
      return {
        walletAddress: result.address,
        error: result.error
      };
    }
    // result.assessment contains the full response; filter it
    return filterRiskFields(result.assessment);
  });
};

// Bulk analysis endpoint
app.post('/api/wallet/analyze/bulk', [
  body('addresses')
    .isArray({ min: 1, max: 100 })
    .withMessage('Addresses must be an array with 1-100 items'),
  body('addresses.*')
    .isLength({ min: 40, max: 42 })
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Each address must be a valid Ethereum address')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid request',
        details: errors.array()
      });
    }

    const { addresses } = req.body;
    
    // Process addresses in batches to avoid overwhelming the Chainalysis API
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(async (address: string) => {
        try {
          const apiUrl = `${CHAINALYSIS_BASE_URL}/api/risk/v2/entities/${address}`;
          const response = await axios.get(apiUrl, {
            headers: {
              'Token': CHAINALYSIS_API_TOKEN
            }
          });
          
          return {
            address,
            assessment: response.data
          };
        } catch (error: any) {
          console.error(`Error fetching data for address ${address}:`, error.message);
          return {
            address,
            error: error.response?.data?.message || 'Failed to fetch risk assessment'
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...processBatchResults(batchResults));
    }
    
    return res.json({
      results,
      totalAnalyzed: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error processing bulk analysis:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to process bulk analysis',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Wallet Analysis Server running on port ${PORT}`);
  console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
  console.log(`🔍 Risk assessment endpoint: http://localhost:${PORT}/api/risk/v2/entities/{address}`);
  console.log(`📝 Analysis endpoint: http://localhost:${PORT}/api/wallet/analyze`);
});

export default app;