import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Signer;
  private supplyChainContract: ethers.Contract;
  private productVerificationContract: ethers.Contract;
  private factoryContract: ethers.Contract;

  constructor() {
    this.initializeContracts();
  }

  private async initializeContracts() {
    try {
      // Initialize provider (using local hardhat node for development)
      const providerUrl = process.env.BLOCKCHAIN_PROVIDER_URL || 'http://localhost:8545';
      this.provider = new ethers.JsonRpcProvider(providerUrl);

      // Initialize signer with private key (should come from secure environment variable)
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
      if (privateKey) {
        this.signer = new ethers.Wallet(privateKey, this.provider);
        this.logger.log('Blockchain wallet initialized with provided private key');
      } else {
        // If no private key provided, use a randomly generated one (not for production)
        const wallet = ethers.Wallet.createRandom();
        this.signer = wallet.connect(this.provider);
        this.logger.warn('Using a randomly generated wallet since no private key was provided!');
      }

      // Load contract addresses and ABIs
      const contractAddressesPath = process.env.CONTRACT_ADDRESSES_PATH || '../../blockchain/deployments/contract-addresses.json';
      let addresses;

      try {
        addresses = JSON.parse(fs.readFileSync(path.resolve(__dirname, contractAddressesPath), 'utf8'));
      } catch (error) {
        this.logger.error(`Failed to load contract addresses from ${contractAddressesPath}`);
        addresses = {
          SupplyChain: process.env.SUPPLY_CHAIN_ADDRESS,
          ProductVerification: process.env.PRODUCT_VERIFICATION_ADDRESS,
          AGRIBLOCKFactory: process.env.AGRIBLOCK_FACTORY_ADDRESS,
        };
      }

      // Load ABIs
      const supplyChainAbiPath = process.env.SUPPLY_CHAIN_ABI_PATH || '../../blockchain/artifacts/contracts/SupplyChain.sol/SupplyChain.json';
      const productVerificationAbiPath = process.env.PRODUCT_VERIFICATION_ABI_PATH || '../../blockchain/artifacts/contracts/ProductVerification.sol/ProductVerification.json';
      const factoryAbiPath = process.env.FACTORY_ABI_PATH || '../../blockchain/artifacts/contracts/AGRIBLOCKFactory.sol/AGRIBLOCKFactory.json';

      // Load ABIs
      const supplyChainAbi = this.loadAbi(supplyChainAbiPath, 'SupplyChain');
      const productVerificationAbi = this.loadAbi(productVerificationAbiPath, 'ProductVerification');
      const factoryAbi = this.loadAbi(factoryAbiPath, 'AGRIBLOCKFactory');

      // Initialize contracts
      if (addresses.SupplyChain && supplyChainAbi) {
        this.supplyChainContract = new ethers.Contract(addresses.SupplyChain, supplyChainAbi, this.signer);
        this.logger.log(`SupplyChain contract initialized at ${addresses.SupplyChain}`);
      }

      if (addresses.ProductVerification && productVerificationAbi) {
        this.productVerificationContract = new ethers.Contract(addresses.ProductVerification, productVerificationAbi, this.signer);
        this.logger.log(`ProductVerification contract initialized at ${addresses.ProductVerification}`);
      }

      if (addresses.AGRIBLOCKFactory && factoryAbi) {
        this.factoryContract = new ethers.Contract(addresses.AGRIBLOCKFactory, factoryAbi, this.signer);
        this.logger.log(`AGRIBLOCKFactory contract initialized at ${addresses.AGRIBLOCKFactory}`);
      }

      this.logger.log('Blockchain service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize blockchain service:', error);
    }
  }

  private loadAbi(abiPath: string, contractName: string) {
    try {
      const artifactPath = path.resolve(__dirname, abiPath);
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      return artifact.abi;
    } catch (error) {
      this.logger.error(`Failed to load ABI for ${contractName}`);
      return null;
    }
  }

  // Supply Chain Contract Methods

  async createProduct(name: string, details: string, price: number, quantity: number) {
    try {
      const priceWei = ethers.parseEther(price.toString());
      const tx = await this.supplyChainContract.createProduct(name, details, priceWei, quantity);
      const receipt = await tx.wait();
      
      // Extract productId from event logs
      const event = receipt.logs
        .filter(log => log.topics[0] === ethers.id('ProductTransferred(uint256,address,address,uint256,uint256)'))
        .map(log => this.supplyChainContract.interface.parseLog(log))[0];
      
      const productId = event?.args[0] || 0;
      
      this.logger.log(`Product created with ID: ${productId}`);
      return productId;
    } catch (error) {
      this.logger.error('Failed to create product on blockchain:', error);
      throw error;
    }
  }

  async getProduct(productId: number) {
    try {
      const product = await this.supplyChainContract.getProduct(productId);
      return {
        id: Number(product[0]),
        name: product[1],
        details: JSON.parse(product[2]),
        seller: product[3],
        price: ethers.formatEther(product[4]),
        quantity: Number(product[5]),
        createdAt: new Date(Number(product[6]) * 1000),
        status: Number(product[7])
      };
    } catch (error) {
      this.logger.error(`Failed to get product ${productId}:`, error);
      throw error;
    }
  }

  async createOrder(productId: number, quantity: number, shippingDetails: string, value: number) {
    try {
      const valueWei = ethers.parseEther(value.toString());
      const tx = await this.supplyChainContract.createOrder(
        productId, 
        quantity, 
        shippingDetails,
        { value: valueWei }
      );
      const receipt = await tx.wait();
      
      // Extract orderId from event logs
      const event = receipt.logs
        .filter(log => log.topics[0] === ethers.id('OrderCreated(uint256,uint256,address,address,uint256,uint256,uint256)'))
        .map(log => this.supplyChainContract.interface.parseLog(log))[0];
      
      const orderId = event?.args[0] || 0;
      
      this.logger.log(`Order created with ID: ${orderId}`);
      return orderId;
    } catch (error) {
      this.logger.error('Failed to create order on blockchain:', error);
      throw error;
    }
  }

  async getOrder(orderId: number) {
    try {
      const order = await this.supplyChainContract.getOrder(orderId);
      return {
        id: Number(order[0]),
        productId: Number(order[1]),
        buyer: order[2],
        seller: order[3],
        quantity: Number(order[4]),
        totalPrice: ethers.formatEther(order[5]),
        orderedAt: new Date(Number(order[6]) * 1000),
        shippingDetails: JSON.parse(order[7]),
        fulfilled: order[8]
      };
    } catch (error) {
      this.logger.error(`Failed to get order ${orderId}:`, error);
      throw error;
    }
  }

  async fulfillOrder(orderId: number) {
    try {
      const tx = await this.supplyChainContract.fulfillOrder(orderId);
      await tx.wait();
      this.logger.log(`Order ${orderId} fulfilled successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to fulfill order ${orderId}:`, error);
      throw error;
    }
  }

  // Product Verification Contract Methods

  async addVerifier(verifierAddress: string, name: string, details: string) {
    try {
      const tx = await this.productVerificationContract.addVerifier(verifierAddress, name, details);
      await tx.wait();
      this.logger.log(`Verifier added: ${verifierAddress}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to add verifier ${verifierAddress}:`, error);
      throw error;
    }
  }

  async issueCertificate(productId: number, certType: number, details: string, validUntil: Date) {
    try {
      const validUntilTimestamp = Math.floor(validUntil.getTime() / 1000);
      const tx = await this.productVerificationContract.issueCertificate(
        productId,
        certType,
        details,
        validUntilTimestamp
      );
      const receipt = await tx.wait();
      
      // Extract certificateId from event logs
      const event = receipt.logs
        .filter(log => log.topics[0] === ethers.id('CertificateIssued(uint256,uint256,uint8,address,uint256,uint256)'))
        .map(log => this.productVerificationContract.interface.parseLog(log))[0];
      
      const certificateId = event?.args[0] || 0;
      
      this.logger.log(`Certificate issued with ID: ${certificateId}`);
      return certificateId;
    } catch (error) {
      this.logger.error(`Failed to issue certificate for product ${productId}:`, error);
      throw error;
    }
  }

  async verifyCertificate(certificateId: number) {
    try {
      const isValid = await this.productVerificationContract.verifyCertificate(certificateId);
      return isValid;
    } catch (error) {
      this.logger.error(`Failed to verify certificate ${certificateId}:`, error);
      throw error;
    }
  }

  async getCertificate(certificateId: number) {
    try {
      const cert = await this.productVerificationContract.getCertificate(certificateId);
      return {
        id: Number(cert[0]),
        productId: Number(cert[1]),
        certType: Number(cert[2]),
        details: JSON.parse(cert[3]),
        issuer: cert[4],
        issuedAt: new Date(Number(cert[5]) * 1000),
        validUntil: new Date(Number(cert[6]) * 1000),
        revoked: cert[7]
      };
    } catch (error) {
      this.logger.error(`Failed to get certificate ${certificateId}:`, error);
      throw error;
    }
  }
}