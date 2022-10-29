import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { InjectedConnector } from '@web3-react/injected-connector'
import { NetworkConnector } from '@web3-react/network-connector'

import metamask_logo from '../../resources/metamask_logo.png';
import trustwallet_logo from '../../resources/trustwallet_logo.png';
import safepal_logo from '../../resources/safepal_logo.png';
import walletconnect_logo from '../../resources/walletconnect_logo.png';
import { IConnectorConfig } from '../core/Interfaces';


const mainNet = {id: 56, RPC_URL: "https://bsc-dataseed.binance.org"}
const testNet = {id: 97, RPC_URL: "https://data-seed-prebsc-1-s1.binance.org:8545"}
const supportedChainIds = [56, 97]
const rpc = {56: "https://bsc-dataseed.binance.org", 97: "https://data-seed-prebsc-1-s1.binance.org:8545"}

const injected = new InjectedConnector({ supportedChainIds })
const socket = new NetworkConnector({ 
    urls: {56: "wss://speedy-nodes-nyc.moralis.io/bcd1a0b5aca5fc417cb55a82/bsc/mainnet/ws"},
    defaultChainId: 56
})
const walletconnect = new WalletConnectConnector({ 
    rpc: {
        56: 'https://bsc-dataseed.binance.org'
    },
    chainId: 56,
    // network: "binance",
    qrcode: true,
    qrcodeModalOptions: {
        mobileLinks: [
            "metamask",
            "trust",
            "safepal"
        ]
    } 
})
export const readOnlyConnector = new NetworkConnector({
    urls: {56: 'https://bsc-dataseed.binance.org'},
    defaultChainId: 56
  })


// configuration array of all the needed connectors
export const connectors: IConnectorConfig[] = [
    {
        name: 'Metamask',
        connector: injected,
        logo: metamask_logo
    },
    {
        name: 'Trust',
        connector: injected,
        logo: trustwallet_logo
    },
    {
        name: 'Safepal',
        connector: injected,
        logo: safepal_logo
    },
    {
        name: 'Wallet Connect',
        connector: walletconnect,
        logo: walletconnect_logo
    }
];
