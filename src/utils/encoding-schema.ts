import {ethers, utils, BigNumber} from 'ethers';
import {ParamType, Result, isAddress} from 'ethers/lib/utils';

export const convertToNFTSchema = (schema: any) => {
  let stringSchema = JSON.stringify(schema);

  stringSchema = stringSchema.replace(
    /"type":"integer"/g,
    '"type":"integer","bigNumber":true'
  );

  stringSchema = stringSchema.replace(
    /'type':'integer'/g,
    "'type':'integer','bigNumber':true"
  );

  stringSchema = stringSchema.replace(
    /"type":"number"/g,
    '"type":"number","bigNumber":true'
  );

  stringSchema = stringSchema.replace(
    /'type':'number'/g,
    "'type':'number','bigNumber':true'"
  );

  return JSON.parse(stringSchema);
};

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

  const DATA_STRUCT = ParamType.fromObject(components[0]);

  const abi = ethers.utils.defaultAbiCoder;

  const DATA_VALUE = abi.encode([DATA_STRUCT], [data]);

  return DATA_VALUE;
};

export const decodeDataFromString = (jsonSchema: any, data: string) => {
  const components = convertJsonSchemaToParamType(jsonSchema.properties);

  const DATA_STRUCT = ParamType.fromObject(components[0]);

  const abi = ethers.utils.defaultAbiCoder;

  const DATA_VALUE = abi.decode([DATA_STRUCT], data);

  return DATA_VALUE;
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

export const convertDecodedArrayToJson = (decodedArray: Result): any => {
  const keys = Object.keys(decodedArray);
  keys.splice(0, decodedArray.length);

  const result = {} as any;
  keys.forEach(key => {
    const value = decodedArray[key];
    return (result[key] = convertValue(value));
  });

  return result;
};

export const convertValue = (value: any): any => {
  if (isAddress(value)) {
    return value.toLowerCase();
  }

  if (value instanceof BigNumber) {
    return value.toString();
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
