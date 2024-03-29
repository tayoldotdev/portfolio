import { type ReadonlyURLSearchParams } from 'next/navigation';
import { type z } from 'zod';
import toast from 'react-hot-toast';

import { type RouterPakcage, type AssemblyModel } from './ModelAssemblyConsole';

export type AssemblyRecord<T extends AssemblyModel> = Record<
    keyof T,
    z.ZodSchema
>;
export type Parser<T extends string | symbol, P extends AssemblyModel> = Record<
    T,
    AssemblyRecord<P>
>;

export function mutate<T extends AssemblyModel, L extends string>(
    RP: RouterPakcage<L>,
    configuration: keyof T,
    value: string,
) {
    RP.mutSearchParams.set(configuration as string, value);

    const search = RP.mutSearchParams.toString();
    const query = search ? `?${search}` : '';

    RP.router.push(`${RP.pathname}${query}`);
}

export type LexiconDevil<K> = Map<K, { value: string; isDefault: boolean }>;

export function consume<
    P extends AssemblyModel,
    T extends Parser<string | symbol, P>,
>(
    PARSERS: T,
    configuration: P,
    searchParams: ReadonlyURLSearchParams,
    LD: LexiconDevil<keyof P>,
) {
    let cfgs = Object.keys(configuration).reduce((acc, c) => acc + ' ' + c);
    if (searchParams.size > 0) {
        searchParams.forEach((param, key) => {
            cfgs = cfgs.replace(key, '');
            const p = PARSERS[configuration.model];
            if (p === undefined) {
                throw new Error(`Missing 'model' configuration PARSER!`);
            }
            const paramParser = p[key as keyof AssemblyRecord<P>].safeParse(
                param,
                {
                    errorMap: (_, ctx) => {
                        return {
                            message: `'${ctx.data}' is not a valid '${key}'`,
                        };
                    },
                },
            );
            if (paramParser.success) {
                LD.set(key as keyof AssemblyRecord<P>, {
                    value: paramParser.data as string,
                    isDefault: false,
                });
            } else {
                // report invalid parameter and set value to default
                paramParser.error.errors.forEach((e) => {
                    toast.error(e.message);
                });
                const defaultConfiguration =
                    configuration[key as keyof AssemblyRecord<P>];
                if (defaultConfiguration === undefined) {
                    toast.error(`Missing default configuration for '${key}'`);
                } else {
                    LD.set(key as keyof AssemblyRecord<P>, {
                        value: defaultConfiguration,
                        isDefault: true,
                    });
                }
            }
        });
    }

    // Set all missing configurations
    cfgs.split(' ').forEach((key) => {
        if (key !== '') {
            const defaultConfiguration =
                configuration[key as keyof AssemblyRecord<P>];
            if (defaultConfiguration === undefined) {
                toast.error(`Missing default configuration for '${key}'`);
            } else {
                LD.set(key as keyof AssemblyRecord<P>, {
                    value: defaultConfiguration,
                    isDefault: true,
                });
            }
        }
    });
}

const URL_QUERY_PARSER = {
    consume,
    mutate,
} as const;

export default URL_QUERY_PARSER;
