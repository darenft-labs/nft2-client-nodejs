import {gql} from 'graphql-request';
import {subqueryService} from '../services/subquery.service';
import {getNFTMetadata} from './blockchain';
import {ethers} from 'ethers';

export async function getCollectionNFTsInfo(
  provider: ethers.providers.JsonRpcProvider,
  chainId: number,
  collectionAddress: string
) {
  const address = collectionAddress.toLowerCase();
  const query = gql`
    {
      nFTs(
        filter: {
          chainId: {equalTo: ${chainId}}
          collection: {equalTo: "${address}"}
        }
        first: 1
        orderBy: TOKEN_ID_ASC
      ) {
        groupedAggregates(groupBy: OWNER) {
          keys
        }
        totalCount
        nodes {
          tokenId
          tokenUri
        }
      }
    }
  `;
  const onchainData: {
    nFTs: {
      groupedAggregates: Array<any>;
      totalCount: number;
      nodes: Array<{
        tokenId: string;
        tokenUri: string;
      }>;
    };
  } = await subqueryService.queryDataOnChain(query, chainId);

  const firstNft =
    onchainData.nFTs.nodes.length > 0 ? onchainData.nFTs.nodes[0] : null;
  const firstNftData = firstNft
    ? await getNFTMetadata(
        provider,
        address,
        firstNft.tokenId,
        firstNft.tokenUri
      )
    : null;

  return {
    collectionAddress: address,
    totalNfts: onchainData.nFTs.totalCount,
    totalOwners: onchainData.nFTs.groupedAggregates.length,
    firstNft: firstNftData,
  };
}
