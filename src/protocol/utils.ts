import {Contract, ethers, utils} from 'ethers';
import {FormatTypes, ParamType, parseEther, Result} from 'ethers/lib/utils';

export const separateJsonSchema = (jsonSchema: any): any[] => {
  const props = jsonSchema?.properties;
  return Object.keys(props).map(key => ({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    title: '',
    description: '',
    properties: {
      [key]: props[key],
    },
    required: [],
    key,
  }));
};

export const convertType = (jsonType: string): string => {
  let type = jsonType;
  switch (jsonType) {
    case 'number':
    case 'integer':
      type = 'uint256';
      break;

    case 'boolean':
      type = 'bool';
      break;

    default:
      break;
  }

  return type;
};

export const convertJsonSchemaToParamType = (jsonSchema: any): any => {
  return Object.keys(jsonSchema).map(field => {
    if (jsonSchema[field].type === 'object') {
      return {
        name: field,
        type: 'tuple',
        components: convertJsonSchemaToParamType(jsonSchema[field].properties),
      };
    }

    if (jsonSchema[field].type === 'array') {
      const elementType = jsonSchema[field].items.type;
      if (elementType === 'object') {
        return {
          name: field,
          type: 'tuple[]',
          components: convertJsonSchemaToParamType(
            jsonSchema[field].items.properties
          ),
        };
      }

      if (['number', 'string'].includes(elementType)) {
        return {
          name: field,
          type: convertType(elementType) + '[]',
        };
      }

      return {
        name: field,
        type: 'tuple[]',
        components: convertJsonSchemaToParamType(jsonSchema[field].properties),
      };
    }

    return {
      name: field,
      type: convertType(jsonSchema[field].type),
    };
  });
};

export const encodeDataFromJsonSchema = (jsonSchema: any, data: any) => {
  const components = convertJsonSchemaToParamType(jsonSchema.properties);

  const DATA_STRUCT = ParamType.fromObject({
    components: components,
    name: 'calls',
    type: 'tuple',
  });

  const formated = DATA_STRUCT.format(FormatTypes.full);

  const TYPE_HASH = utils.keccak256(utils.toUtf8Bytes(formated));

  const abi = ethers.utils.defaultAbiCoder;

  const formattedData = formatData(data);

  const DATA_VALUE = abi.encode(
    ['bytes32', DATA_STRUCT],
    [TYPE_HASH, formattedData]
  );

  return DATA_VALUE;
};

const formatData = (data: any): any => {
  const formattedData = JSON.parse(JSON.stringify(data), (key, value) => {
    if (typeof value === 'number') {
      return parseEther(value.toString());
    }
    return value;
  });
  return formattedData;
};

export const ACCOUNT_ADDR_LENGTH = 20;
export const JSON_KEY_SIGNATURE_LENGTH = 4;

export const MANAGER_CHANNELS = {
  METADATA_DEPLOY_CHANNEL: 1,
  METADATA_GRANT_RIGHT_CHANNEL: 2,
  METADATA_UPDATE_CHANNEL: 3,
};

export const STANDARD_METADATA_KEY_TYPE = {
  LEVEL: 'level',
};

export const STANDARD_METADATA_KEY_TYPES = [STANDARD_METADATA_KEY_TYPE.LEVEL];

const encodeJsonKey = (jsonKey: string): string => {
  return utils
    .keccak256(utils.toUtf8Bytes(`${jsonKey}`))
    .substring(2, 2 + 2 * JSON_KEY_SIGNATURE_LENGTH);
};

export const encodeDataKey = (providerAddr: string, key: string): string => {
  const posStart = 2;
  const providerIdentity = providerAddr.substring(
    posStart,
    posStart + 2 * ACCOUNT_ADDR_LENGTH
  );
  const jsonKey = encodeJsonKey(key);

  const flag = STANDARD_METADATA_KEY_TYPES.includes(key) ? '01' : '00';
  const reservedCode = Array(2 * 7)
    .fill('0')
    .join('');

  const dataKey = '0x' + providerIdentity + jsonKey + flag + reservedCode;
  return dataKey;
};

export const getPredictedMetadataAddress = async (
  nftAddr: string,
  tokenId: string,
  helper: Contract,
  templateFixture: Contract,
  factoryFixture: Contract
): Promise<string> => {
  const predictedMetadataAddr = await helper.getMetadata(
    templateFixture.address,
    factoryFixture.address,
    nftAddr,
    tokenId
  );

  return predictedMetadataAddr;
};
