import { Request } from 'express';
import { ExchangeId } from './deployment/deployment.service';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';

export function extractExchangeId(request: Request, exchangeIdParam?: string): ExchangeId {
  const exchangeId = ExchangeId.OGHedera; // Replace with the single supported ExchangeId

  if (exchangeIdParam && exchangeIdParam !== exchangeId) {
    throw new Error(`Unsupported ExchangeId: only ${exchangeId} is allowed`);
  }

  return exchangeId;
}

export const ApiExchangeIdParam = () =>
  ApiParam({
    name: 'exchangeId',
    required: true,
    enum: ExchangeId,
  });

export const ExchangeIdParam = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const exchangeIdParam = ctx.switchToHttp().getRequest().params.exchangeId;
  return extractExchangeId(request, exchangeIdParam);
});
