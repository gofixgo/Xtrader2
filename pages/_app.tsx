// main entry point of the application
// route structure is based on folder structure


import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { SnackbarProvider } from 'notistack';
import React from 'react';
import dynamic from 'next/dynamic'

import { ApolloProvider } from '@apollo/client';
import { HasuraClient } from '../lib/apolloClient';

// dark mode styling
import { CssBaseline, ThemeProvider } from '@mui/material';
import { darkTheme } from '../lib/theme';

// web3-react
import { Web3ReactProvider, createWeb3ReactRoot } from "@web3-react/core";
import { Web3Provider, JsonRpcBatchProvider, WebSocketProvider } from '@ethersproject/providers';

function getLibrary(provider): Web3Provider {
  return new Web3Provider(provider);
}

function getBatchLibrary(provider): JsonRpcBatchProvider {
  return new JsonRpcBatchProvider(provider);
}

const Web3ReactProviderReadOnly = dynamic(() => import('../components/core/ReadOnlyProvider'), {ssr: false});


function MyApp({ Component, pageProps }: AppProps) {
  //const [loaded, setLoaded] = React.useState(true);


  // React.useEffect(() => {
  //   setLoaded(true);
  // }, []);

  return (
    <>
      <Head>
        <title>XTrader</title>
        <link href="/favicon.ico" rel="icon" />
        <meta content="minimum-scale=1, initial-scale=1, width=device-width" name="viewport" />
      </Head>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <ApolloProvider client={HasuraClient}>
          <Web3ReactProvider getLibrary={getLibrary}>
            <Web3ReactProviderReadOnly getLibrary={getBatchLibrary}>
              <SnackbarProvider maxSnack={3}>
                <Component {...pageProps} />
              </SnackbarProvider>
            </Web3ReactProviderReadOnly>
          </Web3ReactProvider>
        </ApolloProvider>
      </ThemeProvider>
    </>
  )
}

export default MyApp
