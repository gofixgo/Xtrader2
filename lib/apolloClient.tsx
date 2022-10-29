import { ApolloClient, InMemoryCache, HttpLink, gql, useQuery } from '@apollo/client';

// // DEV
// const HasuraClientDev = new ApolloClient({
//   link: new HttpLink(
//     {
//       uri: 'https://xsurge-dev.hasura.app/v1/graphql',
//       fetch,
//       headers: 
//       { 
//         "x-hasura-admin-secret": "ehcZ0Y2hmZvmBH6aco2LChqxsNiQnzfY9Knr0E9tqOj4vcfv3WaKSgoT5pscVq6Y" 
//       } 
//   }),
//   cache: new InMemoryCache(),
// });


//PROD
const HasuraClientProd = new ApolloClient({
  link: new HttpLink(
    {
      uri: 'https://xsurge.hasura.app/v1/graphql',
      fetch,
      headers: 
      { 
        "x-hasura-admin-secret": "hKQ1s3lrP0ZUXTmHIf5pd4EMukDd4SdDOudGpZrdOMUqM4GheSoiG2t8zMFFuECq" 
      } 
  }),
  cache: new InMemoryCache(),
});

// CHANGE THIS TO SWITCH BETWEEN DEV AND PROD
export const HasuraClient = HasuraClientProd;