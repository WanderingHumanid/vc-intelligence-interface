"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Bookmark, Plus, Trash2, Download, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Company {
    id: string;
    name: string;
    domain: string;
    sector: string;
    stage: string;
    location: string;
    founded: string;
    headcount: number;
}

interface UserList {
    id: string;
    name: string;
    created_at: string;
    companies: Company[];
}

export default function ListsPage() {
    const [lists, setLists] = useState<UserList[]>([]);
    const [newListName, setNewListName] = useState("");
    const [loading, setLoading] = useState(true);

    const fetchLists = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('lists')
            .select(`
                id, name, created_at,
                list_members (
                    companies (id, name, domain, sector, stage, location, founded, headcount)
                )
            `)
            .order('name');

        if (data && !error) {
            // Transform data: flatten nested list_members into array of companies
            const formatted = data.map((list: any) => ({
                id: list.id,
                name: list.name,
                created_at: list.created_at,
                // Ensure we only map valid embedded companies objects
                companies: list.list_members.map((lm: any) => lm.companies).filter(Boolean)
            }));
            setLists(formatted);
        } else {
            console.error("Error fetching lists", error);
            toast.error("Failed to load lists from Supabase");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLists();
    }, []);

    const handleCreateList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim()) return;

        const { data, error } = await supabase
            .from('lists')
            .insert({ name: newListName.trim() })
            .select()
            .single();

        if (error) {
            toast.error("Failed to create list");
        } else if (data) {
            setLists(prev => [...prev, { id: data.id, name: data.name, created_at: data.created_at, companies: [] }].sort((a, b) => a.name.localeCompare(b.name)));
            setNewListName("");
            toast.success(`List "${data.name}" created`);
        }
    };

    const handleDeleteList = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete ${name}?`)) {
            const { error } = await supabase.from('lists').delete().eq('id', id);
            if (!error) {
                setLists(lists.filter(l => l.id !== id));
                toast.success("List deleted");
            } else {
                toast.error("Failed to delete list");
            }
        }
    };

    const handleRemoveCompany = async (listId: string, companyId: string, companyName: string) => {
        // Optimistic UI update
        setLists(lists.map(l => {
            if (l.id === listId) {
                return { ...l, companies: l.companies.filter(c => c.id !== companyId) };
            }
            return l;
        }));

        const { error } = await supabase.from('list_members').delete().match({ list_id: listId, company_id: companyId });

        if (error) {
            // Revert on error
            toast.error("Failed to remove company");
            fetchLists();
        } else {
            toast.success(`Removed ${companyName} from list`);
        }
    };

    const handleClearList = async (listId: string, listName: string) => {
        if (confirm(`Are you sure you want to remove ALL companies from ${listName}?`)) {
            // Optimistic UI update
            setLists(lists.map(l => {
                if (l.id === listId) {
                    return { ...l, companies: [] };
                }
                return l;
            }));

            const { error } = await supabase.from('list_members').delete().eq('list_id', listId);

            if (error) {
                toast.error("Failed to clear list");
                fetchLists(); // Revert
            } else {
                toast.success(`Cleared all companies from ${listName}`);
            }
        }
    };

    const handleExportCSV = (list: UserList) => {
        if (list.companies.length === 0) return;

        const headers = ["Name", "Domain", "Sector", "Stage", "Location", "Founded", "Headcount"];
        const rows = list.companies.map(c => [
            `"${c.name}"`, `"${c.domain}"`, `"${c.sector}"`, `"${c.stage}"`,
            `"${c.location}"`, `"${c.founded}"`, c.headcount
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `vc_intelligence_export_${list.name.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exported List to CSV");
    };

    const handleExportJSON = (list: UserList) => {
        if (list.companies.length === 0) return;

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(list.companies, null, 2))}`;
        const link = document.createElement("a");
        link.setAttribute("href", jsonString);
        link.setAttribute("download", `vc_intelligence_export_${list.name.replace(/\s+/g, '_')}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exported List to JSON");
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">My Lists</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage your saved collections and export for outreach or diligence. Synced with Supabase.</p>
            </div>

            {/* Create List Form */}
            <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm max-w-lg transition-colors">
                <CardContent className="pt-6">
                    <form onSubmit={handleCreateList} className="flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                            <label htmlFor="listName" className="text-sm font-medium text-slate-700 dark:text-slate-300">New List Name</label>
                            <Input
                                id="listName"
                                placeholder="e.g. Q3 Fintech Targets"
                                value={newListName}
                                onChange={(e: any) => setNewListName(e.target.value)}
                                className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 placeholder:dark:text-slate-500"
                            />
                        </div>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="w-4 h-4 mr-2" /> Create
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Lists Display */}
            {loading ? (
                <div className="py-20 text-center text-slate-500 dark:text-slate-400 animate-pulse">Loading lists...</div>
            ) : (
                <div className="flex flex-col gap-6">
                    {lists.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center text-center border dark:border-slate-800 rounded-xl border-dashed bg-slate-50 dark:bg-slate-900/50">
                            <Bookmark className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-50">No lists yet</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Create a list above, then add companies to it from their profile pages.</p>
                        </div>
                    ) : (
                        lists.map(list => {
                            return (
                                <Card key={list.id} className="border-slate-200 dark:border-slate-800 dark:bg-slate-950 shadow-sm overflow-hidden transition-colors">
                                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800 pb-4 flex flex-row items-center justify-between space-y-0">
                                        <div className="flex items-center gap-3">
                                            <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                                            <CardTitle className="text-lg text-slate-900 dark:text-slate-50">{list.name}</CardTitle>
                                            <Badge variant="secondary" className="ml-2 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border dark:border-slate-700 shadow-sm font-normal">
                                                {list.companies.length} {list.companies.length === 1 ? 'company' : 'companies'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleExportCSV(list)}
                                                disabled={list.companies.length === 0}
                                                className="text-slate-600 dark:text-slate-300 dark:border-slate-700 h-8 font-medium"
                                            >
                                                CSV
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleExportJSON(list)}
                                                disabled={list.companies.length === 0}
                                                className="text-slate-600 dark:text-slate-300 dark:border-slate-700 h-8 font-medium"
                                            >
                                                JSON
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleClearList(list.id, list.name)}
                                                disabled={list.companies.length === 0}
                                                className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:border-orange-800/50 dark:hover:bg-orange-950/40 dark:hover:border-orange-800 dark:hover:text-orange-300 h-8 font-medium transition-colors"
                                                title="Clear all companies from list"
                                            >
                                                Clear
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteList(list.id, list.name)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 h-8 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {list.companies.length === 0 ? (
                                            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                                This list is empty. Add companies from their profile dashboards.
                                            </div>
                                        ) : (
                                            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {list.companies.map(company => (
                                                    <li key={company.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors gap-4">
                                                        <div className="flex items-start sm:items-center gap-3">
                                                            <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                                                <Building2 className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <Link href={`/companies/${company.id}`} className="font-semibold text-sm text-slate-900 dark:text-slate-50 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1">
                                                                    {company.name} <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                                                </Link>
                                                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{company.sector} · {company.stage}</span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveCompany(list.id, company.id, company.name)}
                                                            className="text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 h-8 font-normal self-start sm:self-center transition-colors"
                                                        >
                                                            Remove
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
