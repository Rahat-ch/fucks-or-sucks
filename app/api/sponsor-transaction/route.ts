import { NextRequest, NextResponse } from 'next/server';
import { validateGasStationKey } from '@/app/lib/shinami';

export async function POST(request: NextRequest) {
  try {
    // Validate API key is configured
    const apiKey = process.env.SHINAMI_GAS_STATION_KEY;
    if (!validateGasStationKey() || !apiKey) {
      return NextResponse.json(
        { error: 'Gas Station not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { serializedTransaction, senderSignature } = body;

    if (!serializedTransaction || !senderSignature) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Call Shinami Gas Station REST API directly to avoid fetch conflicts
    const requestBody = {
      jsonrpc: '2.0',
      method: 'gas_sponsorAndSubmitSignedTransaction',
      params: [serializedTransaction, senderSignature],
      id: 1,
    };

    console.log('Request to Shinami:', {
      url: 'https://api.us1.shinami.com/movement/gas/v1',
      apiKeyPrefix: apiKey?.substring(0, 25) + '...',
      body: requestBody,
    });

    const response = await fetch('https://api.us1.shinami.com/movement/gas/v1', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response from Shinami:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shinami API error response:', errorText);
      throw new Error(`Shinami API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    console.log('Shinami API response:', JSON.stringify(result, null, 2));

    // Check for JSON-RPC errors
    if (result.error) {
      throw new Error(`Shinami RPC error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    // Extract the pending transaction from the JSON-RPC response
    // The result has a pendingTransaction wrapper
    const pendingTx = result.result.pendingTransaction;

    console.log('Pending transaction:', JSON.stringify(pendingTx, null, 2));

    // Return the transaction hash
    return NextResponse.json({
      success: true,
      transactionHash: pendingTx.hash,
      sender: pendingTx.sender,
      sequenceNumber: pendingTx.sequence_number,
    });
  } catch (error) {
    console.error('Error sponsoring transaction:', error);

    // Return error details
    return NextResponse.json(
      {
        error: 'Failed to sponsor transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
