import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BlockchainService } from './blockchain.service';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('product/:id')
  async getProduct(@Param('id') id: string) {
    const productId = parseInt(id);
    return this.blockchainService.getProduct(productId);
  }

  @Get('order/:id')
  async getOrder(@Param('id') id: string) {
    const orderId = parseInt(id);
    return this.blockchainService.getOrder(orderId);
  }

  @Get('certificate/:id')
  async getCertificate(@Param('id') id: string) {
    const certificateId = parseInt(id);
    return this.blockchainService.getCertificate(certificateId);
  }

  @Get('verify-certificate/:id')
  async verifyCertificate(@Param('id') id: string) {
    const certificateId = parseInt(id);
    return {
      certificateId,
      isValid: await this.blockchainService.verifyCertificate(certificateId)
    };
  }

  @Post('create-product')
  @UseGuards(JwtAuthGuard)
  async createProduct(@Body() productData: {
    name: string;
    details: string;
    price: number;
    quantity: number;
  }) {
    const { name, details, price, quantity } = productData;
    const productId = await this.blockchainService.createProduct(name, details, price, quantity);
    return { productId };
  }

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Body() orderData: {
    productId: number;
    quantity: number;
    shippingDetails: string;
    value: number;
  }) {
    const { productId, quantity, shippingDetails, value } = orderData;
    const orderId = await this.blockchainService.createOrder(
      productId, 
      quantity, 
      shippingDetails,
      value
    );
    return { orderId };
  }

  @Post('fulfill-order/:id')
  @UseGuards(JwtAuthGuard)
  async fulfillOrder(@Param('id') id: string) {
    const orderId = parseInt(id);
    const success = await this.blockchainService.fulfillOrder(orderId);
    return { success };
  }

  @Post('add-verifier')
  @UseGuards(JwtAuthGuard)
  async addVerifier(@Body() verifierData: {
    address: string;
    name: string;
    details: string;
  }) {
    const { address, name, details } = verifierData;
    const success = await this.blockchainService.addVerifier(address, name, details);
    return { success };
  }

  @Post('issue-certificate')
  @UseGuards(JwtAuthGuard)
  async issueCertificate(@Body() certData: {
    productId: number;
    certType: number;
    details: string;
    validUntil: string;
  }) {
    const { productId, certType, details } = certData;
    const validUntil = new Date(certData.validUntil);
    const certificateId = await this.blockchainService.issueCertificate(
      productId,
      certType,
      details,
      validUntil
    );
    return { certificateId };
  }
}