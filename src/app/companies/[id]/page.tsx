"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Sparkles, Building2, MapPin, Users, Calendar, AlertCircle, Save, Plus, Bookmark, Copy, Download } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type EnrichmentStatus = "idle" | "loading" | "error" | "success";

interface ProfilePageProps {
    params: Promise<{ id: string }>;
}

export default function CompanyProfilePage(props: ProfilePageProps) {
    const params = use(props.params);
    const companyId = params.id;

    const [company, setCompany] = useState<any>(null);
    const [lists, setLists] = useState<any[]>([]);
    const [listMembers, setListMembers] = useState<Record<string, boolean>>({});
    const [note, setNote] = useState("");
    const [similarCompanies, setSimilarCompanies] = useState<any[]>([]);

    const [loadingDb, setLoadingDb] = useState(true);
    const [status, setStatus] = useState<EnrichmentStatus>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const loadInitialData = async () => {
        setLoadingDb(true);
        // 1. Fetch Company
        const { data: cData } = await supabase.from('companies').select('*').eq('id', companyId).single();
        if (cData) {
            setCompany(cData);
            if (cData.enrichment_summary) setStatus("success");

            // Fetch Similar
            if (cData.embedding) {
                const { data: simData } = await supabase.rpc('match_companies', {
                    query_embedding: cData.embedding,
                    match_threshold: 0.5, // Cosine distance threshold
                    match_count: 5,
                    exclude_id: companyId
                });
                if (simData) setSimilarCompanies(simData);
            }
        }

        // 2. Fetch Lists
        const { data: lData } = await supabase.from('lists').select('*').order('name');
        if (lData) setLists(lData);

        // 3. Fetch Memberships
        const { data: lmData } = await supabase.from('list_members').select('list_id').eq('company_id', companyId);
        if (lmData) {
            const map: Record<string, boolean> = {};
            lmData.forEach(m => map[m.list_id] = true);
            setListMembers(map);
        }

        // 4. Fetch Note
        const { data: nData } = await supabase.from('notes').select('content').eq('company_id', companyId).single();
        if (nData) setNote(nData.content);

        setLoadingDb(false);
    };

    useEffect(() => {
        loadInitialData();

        // Keyboard Shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+S or Ctrl+S to save note
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                saveNote();
            }
            // 'e' to enrich (if not typing in textarea/input)
            if (e.key === 'e' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                // Ensure we have company loaded before trying to enrich
                if (status !== 'loading') {
                    // Using a small hack here to bypass closure staleness, 
                    // though for a better approach handleEnrich could be wrapped in useCallback.
                    // Instead, we just click the hidden/visible button or rely on the state if stable.
                    document.getElementById('enrich-btn')?.click();
                }
            }
            // 'Escape' to blur active element
            if (e.key === 'Escape') {
                (document.activeElement as HTMLElement)?.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    if (loadingDb) return <div className="py-20 text-center animate-pulse text-slate-500">Loading Profile...</div>;

    if (!company) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <h2 className="text-xl font-semibold text-slate-800">Company Not Found</h2>
                <Link href="/companies">
                    <Button variant="outline" className="mt-4">Back to Directory</Button>
                </Link>
            </div>
        );
    }

    const handleEnrich = async (force: boolean = false) => {
        if (!force && status === "loading") return;

        setStatus("loading");
        setErrorMsg("");

        try {
            const response = await fetch("/api/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: `https://${company.domain}`, companyId: company.id }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to fetch enrichment data from the server.");
            }

            // Refetch fresh data from Supabase
            await loadInitialData();
            toast.success("Enrichment Sequence Complete");

        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || "An unknown error occurred.");
            setStatus("error");
            toast.error("Enrichment Failed");
        }
    };

    const saveNote = async () => {
        const { error } = await supabase.from('notes').upsert({
            company_id: companyId,
            content: note,
            updated_at: new Date().toISOString()
        });
        if (!error) {
            toast("Note saved", { description: "Your note has been saved securely to Postgres." });
        } else {
            toast.error("Failed to save note");
        }
    };

    const toggleListMembership = async (listId: string) => {
        const isMember = listMembers[listId];
        setListMembers(prev => ({ ...prev, [listId]: !isMember })); // Optimistic

        if (isMember) {
            await supabase.from('list_members').delete().match({ list_id: listId, company_id: companyId });
        } else {
            await supabase.from('list_members').insert({ list_id: listId, company_id: companyId });
        }
    };

    // Integrations Actions
    const handleExportCRM = () => {
        const blob = new Blob([JSON.stringify(company, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${company.name}-profile.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Downloaded CRM JSON payload");
    };

    const handleShareSlack = () => {
        const text = `*New Target Alert: ${company.name}*\n${company.description}\nDomain: ${company.domain}\nThesis Score: ${company.thesis_score || 'N/A'}`;
        navigator.clipboard.writeText(text);
        toast.success("Copied markdown to clipboard for Slack");
    };

    return (
        <div className="flex flex-col gap-6 pb-20">
            {/* Header Back Link */}
            <div className="flex items-center justify-between">
                <Link href="/companies" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 w-fit transition-colors dark:text-slate-400 dark:hover:text-slate-50">
                    <ArrowLeft className="w-4 h-4" /> Back to Discover
                </Link>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Share & Export</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleShareSlack}><Copy className="w-4 h-4 mr-2" />Copy to Slack</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportCRM}><Download className="w-4 h-4 mr-2" />Export to CRM JSON</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Main Profile Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-white p-6 rounded-xl border shadow-sm dark:bg-[#35322D] dark:border-slate-800 transition-colors">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center border border-teal-100 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{company.name}</h1>
                            <a href={`https://${company.domain}`} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline flex items-center gap-1 text-sm mt-1 dark:text-teal-400">
                                {company.domain} <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                    <p className="text-slate-600 max-w-2xl mt-2 dark:text-slate-300">{company.description}</p>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Location</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 text-right">{company.location || 'Unknown'}</div>

                        <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Sector</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 text-right">{company.sector}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end mt-2">
                        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 dark:text-slate-300">{company.sector}</Badge>
                        <Badge variant="outline" className="dark:text-slate-400 dark:border-slate-700">{company.stage}</Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Column: AI Enrichment */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Card className="border-slate-200 shadow-sm overflow-hidden dark:bg-[#35322D] dark:border-slate-800 transition-colors">
                        <CardHeader className="bg-slate-50/50 border-b pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 space-y-0 dark:bg-transparent dark:border-slate-800">
                            <div className="flex-1 min-w-0">
                                <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-50">
                                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-500" /> Precision AI Scout (Live)
                                </CardTitle>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Extracts live signals from the company's real website using Jina AI and Gemini 2.5 Vector Embeddings.</p>
                            </div>

                            {/* Thesis Score Badge */}
                            {status === "success" && company.thesis_score && (
                                <div className="flex flex-col items-end shrink-0">
                                    <div className="relative group">
                                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200 text-sm whitespace-nowrap cursor-help dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                                            Thesis Match: {company.thesis_score}/100
                                        </div>
                                        <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-50 leading-relaxed">
                                            <p className="font-semibold mb-1">B2B/AI VC Thesis Alignment</p>
                                            <p>AI-scored (0–100) based on market fit, scalability, defensibility, growth signals, and timing. Powered by Gemini structured extraction from live website data.</p>
                                            <p className="mt-1 text-slate-400">90+ Exceptional • 70+ Strong • 50+ Moderate • &lt;50 Weak fit</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 max-w-[220px] text-right leading-tight">
                                        {company.thesis_explanation}
                                    </p>
                                </div>
                            )}

                        </CardHeader>

                        <div className="bg-slate-50 py-3 px-6 border-b flex justify-end gap-2 dark:bg-slate-900/30 dark:border-slate-800">
                            {status === "idle" && (
                                <Button id="enrich-btn" onClick={() => handleEnrich()} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm h-8 relative group">
                                    <Sparkles className="w-4 h-4 mr-2" /> Vector Enrich
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                                        Press 'e'
                                    </div>
                                </Button>
                            )}
                            {status === "loading" && (
                                <Button disabled className="bg-teal-600/70 text-white cursor-not-allowed w-32 h-8">
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                        Fetching...
                                    </span>
                                </Button>
                            )}
                            {(status === "success" || status === "error") && (
                                <Button onClick={() => handleEnrich(true)} variant="outline" className="text-slate-600 h-8 dark:border-slate-700 dark:text-slate-300">
                                    <Sparkles className="w-4 h-4 mr-2" /> Sync Latest
                                </Button>
                            )}
                        </div>

                        <CardContent className="p-0">
                            {status === "idle" && (
                                <div className="py-20 px-6 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/20">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border shadow-sm mb-4 dark:bg-slate-900 dark:border-slate-800">
                                        <Sparkles className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <h3 className="font-medium text-slate-900 dark:text-slate-50">No Intelligence Data</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                                        Click the Vector Enrich button to scrape this company's public website in real-time, generate text embeddings, and rank them against your thesis.
                                    </p>
                                </div>
                            )}

                            {status === "error" && (
                                <div className="p-6">
                                    <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Enrichment Failed</AlertTitle>
                                        <AlertDescription className="mt-2 text-sm break-words relative w-full">
                                            {errorMsg}
                                            <Button variant="link" onClick={() => handleEnrich(true)} className="text-red-700 hover:text-red-900 p-0 h-auto font-semibold block mt-1">
                                                Try Again
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}

                            {status === "success" && company.enrichment_summary && (
                                <div className="p-6 flex flex-col gap-6 animate-in fade-in duration-500">

                                    {/* Last enriched label */}
                                    {company.sources?.[0]?.fetchedAt && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 font-mono">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            Vector cache stored on {new Date(company.sources[0].fetchedAt).toLocaleString()}
                                        </div>
                                    )}

                                    {/* Summary */}
                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg dark:bg-transparent dark:border-slate-800">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2 dark:text-slate-200">Executive Summary</h3>
                                        <p className="text-slate-700 leading-relaxed text-sm dark:text-slate-300">
                                            {company.enrichment_summary}
                                        </p>
                                    </div>

                                    {/* Grid Features */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2 dark:text-slate-200">
                                                <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500" /> What They Do
                                            </h3>
                                            <ul className="space-y-2">
                                                {company.what_they_do?.map((item: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                        <span className="text-teal-600 dark:text-teal-400 mt-1">•</span>
                                                        <span className="leading-snug">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2 dark:text-slate-200">
                                                <AlertCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Extracted Signals
                                            </h3>
                                            <ul className="space-y-2">
                                                {company.signals?.length > 0 ? company.signals.map((item: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                        <span className="text-emerald-600 dark:text-emerald-500 mt-1">→</span>
                                                        <span className="leading-snug">{item}</span>
                                                    </li>
                                                )) : (
                                                    <li className="text-sm text-slate-400 italic">No strong signals detected.</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Keywords */}
                                    <div className="pt-4 border-t dark:border-slate-800">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 dark:text-slate-200">Vector Keywords</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {company.keywords?.map((kw: string, i: number) => (
                                                <Badge key={i} variant="secondary" className="bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 font-normal dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-900/50">
                                                    {kw}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Similar Companies Vector Match */}
                    {similarCompanies.length > 0 && (
                        <Card className="shadow-sm dark:bg-[#35322D] dark:border-slate-800 transition-colors">
                            <CardHeader className="pb-3 border-b dark:bg-transparent dark:border-slate-800">
                                <CardTitle className="text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-500" /> Similar Companies (Vector Match)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {similarCompanies.map(sim => (
                                        <Link href={`/companies/${sim.id}`} key={sim.id}>
                                            <div className="border border-slate-200 rounded-md p-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors cursor-pointer group dark:border-slate-700 dark:bg-[#2F2D2A] dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold text-slate-800 group-hover:text-emerald-700 dark:text-slate-200 dark:group-hover:text-emerald-400">{sim.name}</h4>
                                                    <span className="text-xs font-mono text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full dark:bg-emerald-900/40 dark:text-emerald-400">
                                                        {(sim.similarity * 100).toFixed(1)}% Match
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">{sim.sector} • {sim.stage}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Side Column: Notes & Lists */}
                <div className="flex flex-col gap-6">
                    <Card className="shadow-sm dark:bg-[#35322D] dark:border-slate-800 transition-colors">
                        <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-transparent dark:border-slate-800">
                            <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Bookmark className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Save to List
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-3">
                            {lists.length === 0 ? (
                                <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-md border text-center dark:bg-transparent dark:border-slate-800 dark:text-slate-400">
                                    You haven't created any lists yet.
                                    <Link href="/lists" className="text-teal-600 block mt-1 hover:underline dark:text-teal-400">Go to Lists →</Link>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                                    {lists.map(list => {
                                        const isMember = !!listMembers[list.id];
                                        return (
                                            <Button
                                                key={list.id}
                                                variant={isMember ? "secondary" : "outline"}
                                                className={`w-full justify-start ${isMember ? 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:hover:bg-teal-900/50 dark:border-teal-800' : 'text-slate-600 dark:text-slate-300 dark:border-slate-700'}`}
                                                onClick={() => toggleListMembership(list.id)}
                                            >
                                                {isMember ? <Bookmark className="w-4 h-4 mr-2 fill-current" /> : <Plus className="w-4 h-4 mr-2" />}
                                                {list.name}
                                            </Button>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm flex-1 dark:bg-[#35322D] dark:border-slate-800 transition-colors">
                        <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-transparent dark:border-slate-800">
                            <CardTitle className="text-base text-slate-800 flex items-center justify-between dark:text-slate-200">
                                Review Notes
                                <Button variant="ghost" size="sm" onClick={saveNote} className="h-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:text-teal-300 dark:hover:bg-teal-900/30">
                                    <Save className="w-4 h-4 mr-1" /> Save Note
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-3 h-full pb-0">
                            <Textarea
                                placeholder="Add private analyst notes here. Persists instantly to Postgres DB..."
                                className="flex-1 min-h-[200px] resize-none border-0 focus-visible:ring-0 p-0 shadow-none dark:bg-transparent dark:text-slate-200 dark:placeholder:text-slate-500"
                                value={note}
                                onChange={(e: any) => setNote(e.target.value)}
                            />
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
