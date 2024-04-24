import {ethers, utils, BigNumber} from 'ethers';
import {ParamType, Result, isAddress} from 'ethers/lib/utils';

export const getSchemaByHash = (schemas: Array<any>, hash: string) => {
  for (let item of schemas) {
    if (utils.keccak256(utils.toUtf8Bytes(item.key)) === hash) return item;
  }
  return null;
};

export const separateJsonSchema = (jsonSchema: any): any[] => {
  const props = jsonSchema?.properties;
  if (!props) return [];

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

export const encodeKeyByHash = (key: string) => {
  return utils.keccak256(utils.toUtf8Bytes(key));
};

export const encodeDataFromJsonSchema = (jsonSchema: any, data: any) => {
  const components = convertJsonSchemaToParamType(jsonSchema.properties);

  const propSchema = jsonSchema.properties[components[0].name];
  const encodeData =
    propSchema.type === 'number'
      ? formatFloatData(data, propSchema.decimals)
      : data;

  const DATA_STRUCT = ParamType.fromObject(components[0]);
  const abi = ethers.utils.defaultAbiCoder;
  const DATA_VALUE = abi.encode([DATA_STRUCT], [encodeData]);

  return DATA_VALUE;
};

export const decodeDataFromString = (jsonSchema: any, data: string) => {
  try {
    const components = convertJsonSchemaToParamType(jsonSchema.properties);

    const DATA_STRUCT = ParamType.fromObject(components[0]);
    const abi = ethers.utils.defaultAbiCoder;
    const DATA_VALUE = abi.decode([DATA_STRUCT], data);

    const propSchema = jsonSchema.properties[components[0].name];
    const decimals =
      propSchema.type === 'number' ? propSchema.decimals ?? 18 : null;
    return convertDecodedArrayToJson(DATA_VALUE, decimals);
  } catch (error) {
    console.error(`Decode data failed - ${error}`);
    return {};
  }
};

export const formatFloatData = (value: any, decimals?: number): any => {
  if (typeof decimals != 'number') decimals = 18;
  if (typeof value === 'number') {
    return value < 0.000001 // it will convert to 1e-7
      ? ethers.utils.parseUnits(value.toFixed(decimals), decimals)
      : ethers.utils.parseUnits(value.toString(), decimals);
  }
  return value;
};

export const convertJsonSchemaToParamType = (jsonSchema: any): any => {
  if (!jsonSchema) return jsonSchema;

  return Object.keys(jsonSchema).map(field => {
    if (jsonSchema[field].type == 'object') {
      return {
        name: field,
        type: 'tuple',
        components: convertJsonSchemaToParamType(jsonSchema[field].properties),
      };
    }

    if (jsonSchema[field].type == 'array') {
      const elementType = jsonSchema[field].items.type;
      if (elementType == 'object') {
        return {
          name: field,
          type: 'tuple[]',
          components: convertJsonSchemaToParamType(
            jsonSchema[field].items.properties
          ),
        };
      }

      if (['number', 'string', 'integer', 'boolean'].includes(elementType)) {
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

export const convertType = (jsonType: string): string => {
  let type = jsonType;
  switch (jsonType) {
    case 'number':
      type = 'int256';
      break;
    case 'integer':
      type = 'int64';
      break;

    case 'boolean':
      type = 'bool';
      break;

    default:
      break;
  }
  return type;
};

export const convertDecodedArrayToJson = (
  decodedArray: Result,
  decimals?: number
): any => {
  const keys = Object.keys(decodedArray);
  keys.splice(0, decodedArray.length);

  const result = {} as any;
  keys.forEach(key => {
    const value = decodedArray[key];
    return (result[key] = convertValue(value, decimals));
  });

  return result;
};

export const convertValue = (value: any, decimals?: number): any => {
  if (isAddress(value)) {
    return value.toLowerCase();
  }

  if (value instanceof BigNumber) {
    if (decimals) return parseFloat(ethers.utils.formatUnits(value, decimals));
    else return parseInt(value.toString());
  }

  if (Array.isArray(value)) {
    if (Object.keys(value).length == value.length) {
      // native Array
      return value.map(item => convertValue(item));
    } else {
      // object Array
      return convertDecodedArrayToJson(value);
    }
  }

  return value;
};
