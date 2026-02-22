"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Save, Search, Trash2, SlidersHorizontal, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface SavedSearch {
    id: string;
    name: string;
    query: string;
    sector: string;
    stage: string;
    created_at: string;
}

export default function SavedSearchesPage() {
    const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
    const [newName, setNewName] = useState("");
    const [newQuery, setNewQuery] = useState("");
    const [newSector, setNewSector] = useState("");
    const [newStage, setNewStage] = useState("");
    const [loading, setLoading] = useState(true);

    const fetchSavedSearches = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('saved_searches')
            .select('*')
            .order('created_at', { ascending: false });

        if (data && !error) {
            setSavedSearches(data);
        } else {
            console.error(error);
            toast.error("Failed to load saved searches");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSavedSearches();
    }, []);

    const handleSaveSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || (!newQuery && !newSector && !newStage)) return;

        const newSearchData = {
            name: newName.trim(),
            query: newQuery.trim(),
            sector: newSector.trim(),
            stage: newStage.trim(),
        };

        const { data, error } = await supabase
            .from('saved_searches')
            .insert(newSearchData)
            .select()
            .single();

        if (error) {
            toast.error("Failed to save search shortcut");
        } else if (data) {
            setSavedSearches([data, ...savedSearches]);
            setNewName("");
            setNewQuery("");
            setNewSector("");
            setNewStage("");
            toast.success("Shortcut saved securely to Postgres");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const { error } = await supabase.from('saved_searches').delete().eq('id', id);

        if (!error) {
            setSavedSearches(savedSearches.filter(s => s.id !== id));
            toast.success(`Deleted shortcut: ${name}`);
        } else {
            toast.error("Failed to delete shortcut");
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Saved Searches</h1>
                <p className="text-slate-500 dark:text-slate-400">Persist your frequent filtering combinations to find targets faster. Synced to Supabase.</p>
            </div>

            {/* Manual save form */}
            <Card className="bg-white dark:bg-[#35322D] border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl transition-colors">
                <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Save className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Create New Shortcut
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col gap-4">
                    <form onSubmit={handleSaveSearch} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Shortcut Name</label>
                                <Input className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 placeholder:dark:text-slate-500" placeholder="e.g. AI Seed Companies" value={newName} onChange={(e: any) => setNewName(e.target.value)} required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Keyword</label>
                                <Input className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 placeholder:dark:text-slate-500" placeholder="e.g. platform" value={newQuery} onChange={(e: any) => setNewQuery(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sector Filter</label>
                                <Input className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 placeholder:dark:text-slate-500" placeholder="e.g. Artificial Intelligence" value={newSector} onChange={(e: any) => setNewSector(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Stage Filter</label>
                                <Input className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 placeholder:dark:text-slate-500" placeholder="e.g. Series A" value={newStage} onChange={(e: any) => setNewStage(e.target.value)} />
                            </div>
                        </div>

                        <Button type="submit" className="w-fit bg-teal-600 hover:bg-teal-700 text-white mt-2">
                            Save Search State
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Display */}
            {loading ? (
                <div className="py-20 text-center text-slate-500 dark:text-slate-400 animate-pulse">Loading saved searches...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedSearches.length === 0 ? (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border dark:border-slate-800 rounded-xl border-dashed bg-slate-50 dark:bg-slate-900/50">
                            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-50">No saved searches</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Save specific queries to quickly access targeted segments.</p>
                        </div>
                    ) : (
                        savedSearches.map(search => (
                            <Card key={search.id} className="border-slate-200 dark:border-slate-800 dark:bg-[#35322D] shadow-sm flex flex-col group transition-colors">
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800 pb-3 flex flex-row items-start justify-between space-y-0 relative">
                                    <div className="flex flex-col gap-1 pr-6">
                                        <CardTitle className="text-lg text-slate-900 dark:text-slate-50 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                            {search.name}
                                        </CardTitle>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                            {new Date(search.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(search.id, search.name)} className="absolute top-2 right-2 h-8 w-8 p-0 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-4 flex flex-col gap-4 flex-1">
                                    <div className="flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
                                        {search.query && (
                                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700">
                                                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> {search.query}
                                            </div>
                                        )}
                                        {search.sector && (
                                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700">
                                                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Sector: {search.sector}
                                            </div>
                                        )}
                                        {search.stage && (
                                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700">
                                                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Stage: {search.stage}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-2">
                                        <Link href={`/companies?q=${encodeURIComponent(search.query || '')}&sector=${encodeURIComponent(search.sector || '')}&stage=${encodeURIComponent(search.stage || '')}`}>
                                            <Button variant="outline" className="w-full text-teal-600 border-teal-200 hover:bg-teal-50 bg-white dark:bg-transparent dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-900/30 transition-colors">
                                                Execute Search <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
