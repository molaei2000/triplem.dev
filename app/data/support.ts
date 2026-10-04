/**
 * Ways to support the site (/support). Only what must not be translated lives here: the Reymit
 * link and the wallet addresses. The copy is in i18n under `supportPage.*`.
 *
 * Both addresses were checked when they were added: the BEP20 one passes its EIP-55 checksum and
 * the TRC20 one its base58check. Re-check any new address the same way before shipping it; a typo
 * here sends money nowhere.
 */
export const REYMIT_URL = "https://reymit.ir/triplem";

export interface Wallet {
    id: string;
    /** Token standard as wallets and exchanges label it. */
    network: "BEP20" | "TRC20";
    /** Chain name shown next to the standard. */
    chain: string;
    /** `tm:` icon for the chain. */
    icon: string;
    address: string;
}

export const WALLETS: Wallet[] = [
    {
        id: "usdt-bep20",
        network: "BEP20",
        chain: "BNB Smart Chain",
        icon: "tm:bnb-chain",
        address: "0x986cbb85b10cD43dFA034f49b19252cd5d72a8a5",
    },
    {
        id: "usdt-trc20",
        network: "TRC20",
        chain: "Tron",
        icon: "tm:tron",
        address: "TBYpcWY5fZDRuWUPQC1FgVfKQTZoAQHGas",
    },
];
