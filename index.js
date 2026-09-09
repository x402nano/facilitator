/***************************************************************
**               facilitator-docker - V0.1.0
**             x402 Protocol Facilitator for Nano
**
** Endpoints:
**    /verify - Verify a Nano transaction (not yet processed on the network)
**    /settle - Settle a Nano transaction (processed on the network)
**    /supported - List supported x402 schemes and networks
**
****************************************************************/

import 'dotenv/config'

import express from 'express'
import { x402Facilitator } from '@x402/core/facilitator'
import { ExactNanoScheme } from '@x402nano/exact/facilitator'
import { URL } from '@x402nano/typescript-common'
import { Helper } from '@x402nano/helper'
import cors from 'cors'
import bunyan from 'bunyan'

/***************************************************************/

const NANO_RPC_URL = process.env.NANO_RPC_URL

if (!URL.safeParse(NANO_RPC_URL).success) {
  console.error(`NANO_RPC_URL environment variable not valid in .env file`)
  console.error(`❌ Cannot start x402nano Facilitator`)
  process.exit(1)
}

const PORT = Number(process.env.PORT || 3000)

/***************************************************************/
// Configure logging

let logger
const loggingEnabled = process.env.ENABLE_LOGGING === 'true'
const loggingVerbose = process.env.LOGGING_VERBOSE === 'true'

if (loggingEnabled) {
  logger = bunyan.createLogger({
    name: 'facilitator',
    streams: [{
      level: 'info',
      stream: process.stdout // Send logs to the container's STDOUT
    }]
  })
}

function log({message, context}) {
  if (loggingEnabled) {
    logger.info(message + (loggingVerbose ? ' --- Context: ' + JSON.stringify(context) : ''))
  }
}

/***************************************************************/

const authenticateBearerToken = (req, res, next) => {
  const HTTP_UNAUTHORIZED = 401
  const UNAUTHORIZED = 'Unauthorized'

  if (!process.env.AUTHORIZATION_BEARER_TOKEN) {
    return next()
  }

  let authorizationHeader = req.get('Authorization')

  if (!authorizationHeader) {
    return res.status(HTTP_UNAUTHORIZED).send(UNAUTHORIZED)
  }
  if (!authorizationHeader.startsWith('Bearer')) {
    return res.status(HTTP_UNAUTHORIZED).send(UNAUTHORIZED)
  }

  const token = authorizationHeader.split(' ')[1];  // Bearer <token>
  if (token == null) {
    return res.status(HTTP_UNAUTHORIZED).send(UNAUTHORIZED)
  }

  if (token === process.env.AUTHORIZATION_BEARER_TOKEN) {
    return next()
  } else {
    return res.status(HTTP_UNAUTHORIZED).send(UNAUTHORIZED)
  }
}

/***************************************************************/
// Configure server

const app = express()
app.use(express.json())
app.use(cors())

// Register bearer token authentication middleware
app.use(authenticateBearerToken)

// ---------------------------------------------------
// FACILITATOR SETUP

// Create x402Facilitator instance from x402 protocol core code.
const facilitator = new x402Facilitator()

// Create instance of Helper that will help with Nano RPC communication.
// Pass in configuration object with the URL of the Nano RPC to use for Nano network communication.
const helper = new Helper({
  NANO_RPC_URL
})

// Create instance of the implementation of the x402 Nano "exact" payment scheme for x402 Facilitator.
// Pass in Helper instance just created.
const exactNanoScheme = new ExactNanoScheme(helper)

// Register the Nano network that the x402 Facilitator verifies and settles transactions for.
// Also pass the scheme instance just created. Defaults to "nano:mainnet"
facilitator.register(process.env.X402_NETWORK_IDENTIFIER || 'nano:mainnet', exactNanoScheme)

// Lifecycle hooks to log verify/settle attempts.
facilitator
  .onBeforeVerify((context) => {
    log({
      message: `Verifying payment for ${context?.requirements?.amount} raw to ${context?.requirements?.payTo} on network ${context?.requirements?.network}`,
      context
    })
  })
  .onAfterVerify((context) => {   
    if (context.result.isValid) {
      log({
        message: `✅ Successfully verified payment for ${context?.requirements?.amount} raw to ${context?.requirements?.payTo} on network ${context?.requirements?.network}`,
        context
      })
    } else {
      log({
        message: `❌ Payment verification failed for ${context?.requirements?.amount} raw to ${context?.requirements?.payTo} on network ${context?.requirements?.network}`,
        context
      })
    }    
  })
  .onBeforeSettle((context) => {
    log({
      message: `Settling payment for ${context?.requirements?.amount} raw to ${context?.requirements?.payTo} on network ${context?.requirements?.network}`,
      context
    })
  })
  .onAfterSettle((context) => {
    if (context.result.success) {
      log({
        message: `✅ Successfully settled payment for ${context?.requirements?.amount} raw to ${context?.requirements?.payTo} on network ${context?.requirements?.network}`,
        context
      })
    } else {
      log({
        message: `❌ Payment settlement failed for ${context?.requirements?.amount} raw to ${context?.requirements?.payTo} on network ${context?.requirements?.network}`,
        context
      })
    }    
  })

// ---------------------------------------------------
// ENDPOINT CREATION

// Create the /verify endpoint of the Facilitator.
app.post('/verify', async (req, res) => {
  try {
    // Endpoint will be passed in paymentPayload and paymentRequirements from the Resource Server.
    const { paymentPayload, paymentRequirements } = req.body ?? {}

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({ error: 'paymentPayload and paymentRequirements are required' })
    }

    // Facilitator attempts to verify the payment before eventual settlement (verifies block contents, performs balance check etc..).
    let verifyResult = await facilitator.verify(paymentPayload, paymentRequirements)

    res.json(verifyResult)
  } catch (error) {
    // Express 4 does not catch async errors; without this an unhandled rejection stops the process on Node >= 15.
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// -----

// Create the /verify endpoint of the Facilitator.
app.post('/settle', async (req, res) => {
  try {
    // Endpoint will be passed in paymentPayload and paymentRequirements from the Resource Server.
    const { paymentPayload, paymentRequirements } = req.body ?? {}

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({ error: 'paymentPayload and paymentRequirements are required' })
    }

    // Facilitator attempts to settle the payment (i.e. process the Nano send block on the Nano network).
    let settleResult = await facilitator.settle(paymentPayload, paymentRequirements)

    res.json(settleResult)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})


// -----

// Create the /supported endpoint of the Facilitator.
app.get('/supported', (req, res) => {  

  try {

    const response = facilitator.getSupported()

    res.json(response)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }

})

// ---------------------------------------------------

app.listen(PORT, () => {
  console.log(`✅ x402nano Facilitator listening on port ${PORT}`)
})

