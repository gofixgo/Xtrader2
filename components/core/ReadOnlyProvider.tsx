import { createWeb3ReactRoot } from '@web3-react/core'
const Web3ReactProviderReadOnly = createWeb3ReactRoot('readOnly');
const Web3ReactProviderReadOnlySSR = ({children, getLibrary}) => {
  return (
    <Web3ReactProviderReadOnly getLibrary={getLibrary}>
      {children}
    </Web3ReactProviderReadOnly>
  )
}

export default Web3ReactProviderReadOnlySSR;
