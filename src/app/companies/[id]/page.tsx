"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Sparkles, Building2, MapPin, Users, Calendar, AlertCircle, Save, Plus, Bookmark } from "lucide-react";
import companiesData from "../../../../data/companies.json";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type EnrichmentStatus = "idle" | "loading" | "error" | "success";

interface ProfilePageProps {
    params: Promise<{ id: string }>;
}

export default function CompanyProfilePage(props: ProfilePageProps) {
    const params = use(props.params);
    const companyId = params.id;

    const company = companiesData.find(c => c.id === companyId);

    const [enrichmentCache, setEnrichmentCache] = useLocalStorageState<Record<string, any>>("ENRICHMENT_CACHE", {});
    const [notesCache, setNotesCache] = useLocalStorageState<Record<string, string>>("NOTES", {});
    const [lists, setLists] = useLocalStorageState<any[]>("USER_LISTS", []);

    const cachedData = enrichmentCache[companyId];

    const [status, setStatus] = useState<EnrichmentStatus>(cachedData ? "success" : "idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [note, setNote] = useState(notesCache[companyId] || "");

    useEffect(() => {
        // Sync note state when company changes
        setNote(notesCache[companyId] || "");
    }, [companyId, notesCache]);

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
                body: JSON.stringify({ url: company.website }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch enrichment data from the server.");
            }

            // Success
            setEnrichmentCache((prev) => ({
                ...prev,
                [companyId]: data
            }));
            setStatus("success");

        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || "An unknown error occurred.");
            setStatus("error");
        }
    };

    const saveNote = () => {
        setNotesCache((prev) => ({
            ...prev,
            [companyId]: note
        }));
        toast("Note saved", {
            description: "Your note has been saved to local storage.",
        });
    };

    const toggleListMembership = (listId: string) => {
        setLists(lists.map(list => {
            if (list.id === listId) {
                const isMember = list.companyIds.includes(companyId);
                return {
                    ...list,
                    companyIds: isMember
                        ? list.companyIds.filter((id: string) => id !== companyId)
                        : [...list.companyIds, companyId]
                };
            }
            return list;
        }));
    };

    return (
        <div className="flex flex-col gap-6 pb-20">
            {/* Header Back Link */}
            <Link href="/companies" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 w-fit transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Discover
            </Link>

            {/* Main Profile Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{company.name}</h1>
                            <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm mt-1">
                                {company.website.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                    <p className="text-slate-600 max-w-2xl mt-2">{company.description}</p>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Location</div>
                        <div className="font-medium text-slate-800 text-right">{company.location}</div>

                        <div className="text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Employees</div>
                        <div className="font-medium text-slate-800 text-right">{company.headcount.toLocaleString()}</div>

                        <div className="text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Founded</div>
                        <div className="font-medium text-slate-800 text-right">{company.founded}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end mt-2">
                        <Badge variant="secondary" className="bg-slate-100">{company.sector}</Badge>
                        <Badge variant="outline">{company.stage}</Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Column: AI Enrichment */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b pb-4 flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                                    <Sparkles className="w-4 h-4 text-blue-600" /> Web Scrape Intelligence (Live)
                                </CardTitle>
                                <p className="text-sm text-slate-500 mt-1">Extracts live signals from the company's real website using Jina AI and Gemini 1.5.</p>
                            </div>

                            {status === "idle" && (
                                <Button onClick={() => handleEnrich()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                    <Sparkles className="w-4 h-4 mr-2" /> Enrich Data
                                </Button>
                            )}
                            {status === "loading" && (
                                <Button disabled className="bg-blue-600/70 text-white cursor-not-allowed w-32">
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                        Fetching...
                                    </span>
                                </Button>
                            )}
                            {(status === "success" || status === "error") && (
                                <Button onClick={() => handleEnrich(true)} variant="outline" className="text-slate-600">
                                    <Sparkles className="w-4 h-4 mr-2" /> Re-enrich
                                </Button>
                            )}
                        </CardHeader>

                        <CardContent className="p-0">
                            {status === "idle" && (
                                <div className="py-20 px-6 flex flex-col items-center justify-center text-center bg-slate-50">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border shadow-sm mb-4">
                                        <Sparkles className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <h3 className="font-medium text-slate-900">No Intelligence Data</h3>
                                    <p className="text-sm text-slate-500 max-w-sm mt-1">
                                        Click the Enrich button above to scrape this company's public website in real-time and extract structured insights.
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

                            {status === "success" && cachedData && (
                                <div className="p-6 flex flex-col gap-6 animate-in fade-in duration-500">

                                    {/* Last enriched label */}
                                    {cachedData.sources?.[0]?.fetchedAt && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 font-mono">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            Data extracted on {new Date(cachedData.sources[0].fetchedAt).toLocaleString()}
                                        </div>
                                    )}

                                    {/* Summary */}
                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">Executive Summary</h3>
                                        <p className="text-slate-700 leading-relaxed text-sm">
                                            {cachedData.summary}
                                        </p>
                                    </div>

                                    {/* Grid Features */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-slate-400" /> What They Do
                                            </h3>
                                            <ul className="space-y-2">
                                                {cachedData.whatTheyDo?.map((item: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                        <span className="text-blue-600 mt-1">•</span>
                                                        <span className="leading-snug">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-slate-400" /> Extracted Signals
                                            </h3>
                                            <ul className="space-y-2">
                                                {cachedData.signals?.length > 0 ? cachedData.signals.map((item: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                        <span className="text-emerald-600 mt-1">→</span>
                                                        <span className="leading-snug">{item}</span>
                                                    </li>
                                                )) : (
                                                    <li className="text-sm text-slate-400 italic">No strong signals detected.</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Keywords */}
                                    <div className="pt-4 border-t">
                                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Keywords</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {cachedData.keywords?.map((kw: string, i: number) => (
                                                <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-normal">
                                                    {kw}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Side Column: Notes & Lists */}
                <div className="flex flex-col gap-6">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b bg-slate-50/50">
                            <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                                <Bookmark className="w-4 h-4 text-slate-500" /> Save to List
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-3">
                            {lists.length === 0 ? (
                                <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-md border text-center">
                                    You haven't created any lists yet.
                                    <Link href="/lists" className="text-blue-600 block mt-1 hover:underline">Go to Lists →</Link>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                                    {lists.map(list => {
                                        const isMember = list.companyIds.includes(companyId);
                                        return (
                                            <Button
                                                key={list.id}
                                                variant={isMember ? "secondary" : "outline"}
                                                className={`w-full justify-start ${isMember ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200' : 'text-slate-600'}`}
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

                    <Card className="shadow-sm flex-1">
                        <CardHeader className="pb-3 border-b bg-slate-50/50">
                            <CardTitle className="text-base text-slate-800 flex items-center justify-between">
                                Review Notes
                                <Button variant="ghost" size="sm" onClick={saveNote} className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    <Save className="w-4 h-4 mr-1" /> Save
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-3 h-full pb-0">
                            <Textarea
                                placeholder="Add private analyst notes here. Persists in your local browser storage automatically..."
                                className="flex-1 min-h-[200px] resize-none border-0 focus-visible:ring-0 p-0 shadow-none"
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
