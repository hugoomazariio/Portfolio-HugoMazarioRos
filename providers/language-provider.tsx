"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n";
import { parseMarkdown } from "@/lib/markdown";
import { deepMerge } from "@/lib/utils";

interface LanguageContextType {
    language: Locale;
    dict: any;
    content: any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: React.ReactNode;
    lang: Locale;
    dictionary: Record<string, any>;
    contents: Record<string, any>;
    shared: Record<string, any>;
}

export function LanguageProvider({ children, lang, dictionary, contents, shared }: LanguageProviderProps) {
    const dict = useMemo(
        () => parseMarkdown(dictionary),
        [dictionary],
    );

    const content = useMemo(
        () => parseMarkdown(deepMerge(shared, contents)),
        [contents, shared],
    );

    return (
        <LanguageContext.Provider value={{ language: lang, dict, content }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
    return context;
}