import { Address, WalletClient, encodeFunctionData, Chain, Account, PublicClient } from 'viem';
import { Contract } from 'lib/interfaces';
import { getPermitDomain } from './tokens';

// DAI token addresses on different chains
const DAI_ADDRESSES: Address[] = [
  '0x6B175474E89094C44Da98b954EedeAC495271d0F', // Ethereum Mainnet
  '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // Polygon
  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // Arbitrum
];

interface DaiPermitMessage {
  holder: Address;
  spender: Address;
  nonce: bigint;
  expiry: bigint;
  allowed: boolean;
}

interface PermitMessage {
  owner: Address;
  spender: Address;
  value: bigint;
  nonce: bigint;
  deadline: bigint;
}

export const permit = async (walletClient: WalletClient, contract: Contract, spender: Address, amount: bigint) => {
  const address = walletClient.account.address;
  const nonce = await contract.publicClient.readContract({
    ...contract,
    functionName: 'nonces',
    args: [address],
  }) as bigint;

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60); // 24 hours from now
  const verifyingContract = contract.address;

  // DAI uses a different form of permit
  if (DAI_ADDRESSES.includes(verifyingContract)) {
    const { v, r, s } = await signDaiPermit(walletClient, contract, address, spender, nonce, deadline, false);
    return walletClient.writeContract({
      ...contract,
      account: walletClient.account,
      chain: walletClient.chain,
      functionName: 'permit',
      args: [address, spender, nonce, deadline, false, v, r, s],
    });
  }

  const { v, r, s } = await signPermit(walletClient, contract, address, spender, amount, nonce, deadline);
  return walletClient.writeContract({
    ...contract,
    account: walletClient.account,
    chain: walletClient.chain,
    functionName: 'permit',
    args: [address, spender, amount, deadline, v, r, s],
  });
};

const signDaiPermit = async (
  walletClient: WalletClient,
  contract: Contract,
  holder: Address,
  spender: Address,
  nonce: bigint,
  expiry: bigint,
  allowed: boolean,
) => {
  const domain = {
    name: 'Dai Stablecoin',
    version: '1',
    chainId: await walletClient.getChainId(),
    verifyingContract: contract.address,
  };

  const message: DaiPermitMessage = { holder, spender, nonce, expiry, allowed };

  const signature = await walletClient.signTypedData({
    account: walletClient.account,
    domain,
    types: {
      Permit: [
        { name: 'holder', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
        { name: 'allowed', type: 'bool' },
      ],
    },
    primaryType: 'Permit',
    message,
  });

  return { v: Number(signature.slice(-2)), r: signature.slice(0, 66), s: `0x${signature.slice(66, 130)}` };
};

const signPermit = async (
  walletClient: WalletClient,
  contract: Contract,
  owner: Address,
  spender: Address,
  value: bigint,
  nonce: bigint,
  deadline: bigint,
) => {
  const domain = {
    name: await contract.publicClient.readContract({
      address: contract.address,
      abi: [{ inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' }],
      functionName: 'name',
    }) as string,
    version: '1',
    chainId: await walletClient.getChainId(),
    verifyingContract: contract.address,
  };

  const message: PermitMessage = { owner, spender, value, nonce, deadline };

  const signature = await walletClient.signTypedData({
    account: walletClient.account,
    domain,
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    message,
  });

  return { v: Number(signature.slice(-2)), r: signature.slice(0, 66), s: `0x${signature.slice(66, 130)}` };
};

export const getLastCancelled = async (approvalEvents: any[], token: { contract: { address: string } }) => {
  const events = approvalEvents.filter((event) => event.address.toLowerCase() === token.contract.address.toLowerCase());
  if (events.length === 0) return null;
  return events[events.length - 1];
};
