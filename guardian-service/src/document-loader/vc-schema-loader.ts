import { Schema } from '@entity/schema';
import { getMongoRepository, MongoRepository } from 'typeorm';
import { ISchema } from '@guardian/interfaces';
import { SchemaLoader } from '@hedera-modules';

/**
 * VC schema loader
 */
export class VCSchemaLoader extends SchemaLoader {
    constructor(
        private readonly context: string
    ) {
        super();
    }

    public async has(context: string | string[], iri: string, type: string): Promise<boolean> {
        if (type !== 'vc') {
            return false;
        }
        if (Array.isArray(context)) {
            for (let i = 0; i < context.length; i++) {
                const element = context[i];
                if (element.startsWith(this.context)) {
                    return true;
                }
            }
        } else {
            return context && context.startsWith(this.context);
        }
        return false;
    }

    public async get(context: string | string[], iri: string, type: string): Promise<any> {
        let schemas: ISchema[];
        if (typeof context == 'string') {
            schemas = await this.loadSchemaContexts([context]);
        } else {
            schemas = await this.loadSchemaContexts(context);
        }

        if (!schemas) {
            throw new Error('Schema not found');
        }

        const _iri = '#' + iri;
        for (let i = 0; i < schemas.length; i++) {
            const schema = schemas[i];
            if (schema.iri === _iri) {
                if (!schema.document) {
                    throw new Error('Document not found');
                }
                const document = schema.document;
                return this.vcSchema(document);
            }
        }

        throw new Error('IRI Schema not found');
    }

    private async loadSchemaContexts(context: string[]): Promise<ISchema[]> {
        try {
            if (!context) {
                return null;
            }
            const schema = await getMongoRepository(Schema).find({
                where: { contextURL: { $in: context } }
            });
            return schema
        }
        catch (error) {
            return null;
        }
    }

    private vcSchema(document: any): any {
        const def = {};
        def[document['$id']] = document;
        return {
            'type': 'object',
            'properties': {
                '@context': {
                    'oneOf': [
                        {
                            'type': 'string',
                        },
                        {
                            'type': 'array',
                            'items': {
                                'type': 'string',
                            }
                        },
                    ],
                },
                'id': {
                    'type': 'string',
                },
                'type': {
                    'oneOf': [
                        {
                            'type': 'string',
                        },
                        {
                            'type': 'array',
                            'items': {
                                'type': 'string',
                            }
                        },
                    ],
                },
                'issuer': {
                    'oneOf': [
                        {
                            'type': 'string',
                        },
                        {
                            'type': 'object',
                            'properties': {
                                'id': {
                                    'type': 'string',
                                },
                            },
                        },
                    ],
                },
                'issuanceDate': { 'type': 'string' },
                'credentialSubject': {
                    'oneOf': [
                        {
                            "$ref": document['$id']
                        },
                        {
                            'type': 'array',
                            'items': {
                                "$ref": document['$id']
                            },
                        }
                    ],
                },
                'proof': {
                    'type': 'object',
                    'properties': {
                        'type': {
                            'oneOf': [
                                {
                                    'type': 'string',
                                },
                                {
                                    'type': 'array',
                                    'items': {
                                        'type': 'string',
                                    }
                                },
                            ],
                        },
                        'created': {
                            'type': 'string',
                        },
                        'proofPurpose': {
                            'type': 'string',
                        },
                        'verificationMethod': {
                            'type': 'string',
                        },
                        'jws': {
                            'type': 'string',
                        },
                    },
                    'additionalProperties': false,
                }
            },
            'required': ['@context'],
            'additionalProperties': false,
            '$defs': def
        };
    }
}
