"use client";

import { useState, useMemo, Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search as SearchIcon, SlidersHorizontal, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function CompaniesPage() {
    const [search, setSearch] = useState("");
    const [sectorFilter, setSectorFilter] = useState("");
    const [stageFilter, setStageFilter] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const [enrichmentFilter, setEnrichmentFilter] = useState(""); // 'enriched' | 'pending' | ''
    const [thesisScoreMin, setThesisScoreMin] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
    const [companiesData, setCompaniesData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTracking, setIsTracking] = useState(false);
    const [trackUrl, setTrackUrl] = useState("");
    const [trackOpen, setTrackOpen] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const itemsPerPage = 10;

    // Fetch data from Supabase on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            const { data, error } = await supabase
                .from("companies")
                .select("*")
                .order("name");

            if (error) {
                console.error("Error fetching companies:", error);
            } else if (data) {
                setCompaniesData(data);
            }
            setLoading(false);
        };
        fetchCompanies();

        // Keyboard Shortcut: '/' to focus search
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "/" && document.activeElement !== searchInputRef.current) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Extract unique filter options
    const sectors = useMemo(() => Array.from(new Set(companiesData.map(c => c.sector))).sort(), [companiesData]);
    const stages = useMemo(() => Array.from(new Set(companiesData.map(c => c.stage))).sort(), [companiesData]);
    const locations = useMemo(() => Array.from(new Set(companiesData.map(c => c.location))).sort(), [companiesData]);

    // Active filter count for badge
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (sectorFilter) count++;
        if (stageFilter) count++;
        if (locationFilter) count++;
        if (enrichmentFilter) count++;
        if (thesisScoreMin > 0) count++;
        return count;
    }, [sectorFilter, stageFilter, locationFilter, enrichmentFilter, thesisScoreMin]);

    const clearAllFilters = () => {
        setSectorFilter(""); setStageFilter(""); setLocationFilter("");
        setEnrichmentFilter(""); setThesisScoreMin(0); setSearch("");
        setCurrentPage(1);
    };

    // Filter mechanism
    const filteredData = useMemo(() => {
        return companiesData.filter(company => {
            const matchesSearch =
                company.name.toLowerCase().includes(search.toLowerCase()) ||
                company.description.toLowerCase().includes(search.toLowerCase());
            const matchesSector = sectorFilter ? company.sector === sectorFilter : true;
            const matchesStage = stageFilter ? company.stage === stageFilter : true;
            const matchesLocation = locationFilter ? company.location === locationFilter : true;
            const matchesEnrichment = enrichmentFilter === 'enriched'
                ? !!company.last_enriched_at
                : enrichmentFilter === 'pending'
                    ? !company.last_enriched_at
                    : true;
            const matchesThesis = thesisScoreMin > 0
                ? (company.thesis_score || 0) >= thesisScoreMin
                : true;
            return matchesSearch && matchesSector && matchesStage && matchesLocation && matchesEnrichment && matchesThesis;
        });
    }, [companiesData, search, sectorFilter, stageFilter, locationFilter, enrichmentFilter, thesisScoreMin]);

    // Sorting calculation
    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    // Pagination calculation
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(start, start + itemsPerPage);
    }, [sortedData, currentPage]);

    // Handle page resets on filter change
    const handleSearch = (val: string) => { setSearch(val); setCurrentPage(1); };
    const handleSector = (val: string) => { setSectorFilter(val); setCurrentPage(1); };
    const handleStage = (val: string) => { setStageFilter(val); setCurrentPage(1); };
    const handleLocation = (val: string) => { setLocationFilter(val); setCurrentPage(1); };
    const handleEnrichment = (val: string) => { setEnrichmentFilter(val); setCurrentPage(1); };
    const handleThesisScore = (val: number) => { setThesisScoreMin(val); setCurrentPage(1); };

    // Sorting actions
    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-slate-600" /> : <ArrowDown className="w-3 h-3 text-slate-600" />;
    };

    const handleTrackCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackUrl) return;

        setIsTracking(true);
        try {
            const res = await fetch('/api/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: trackUrl })
            });

            const result = await res.json();
            if (result.success && result.company) {
                toast.success('Company shell created! Routing to profile...');
                setTrackOpen(false);
                setTrackUrl("");
                router.push(`/companies/${result.company.id}`);
            } else {
                throw new Error(result.error || 'Failed to track company');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsTracking(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Discover</h1>
                    <p className="text-slate-500 dark:text-slate-400">Search, filter, and track active startup targets.</p>
                </div>

                <Dialog open={trackOpen} onOpenChange={setTrackOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white shrink-0">
                            <Plus className="w-4 h-4 mr-2" />
                            Track New Target
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] dark:bg-[#35322D] dark:border-slate-800">
                        <DialogHeader>
                            <DialogTitle className="dark:text-slate-50">Track New Target</DialogTitle>
                            <DialogDescription className="dark:text-slate-400">
                                Enter the website URL of a company you want to track. We will instantly create a shell profile for vector enrichment.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleTrackCompany}>
                            <div className="grid gap-4 py-4">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="url" className="text-sm font-medium dark:text-slate-300">
                                        Company URL
                                    </label>
                                    <Input
                                        id="url"
                                        type="url"
                                        placeholder="https://example.com"
                                        value={trackUrl}
                                        onChange={(e: any) => setTrackUrl(e.target.value)}
                                        required
                                        className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isTracking} className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto">
                                    {isTracking ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Tracking...</>
                                    ) : (
                                        'Create Profile'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-500 animate-pulse">
                    Loading companies...
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                            {/* Search */}
                            <div className="relative flex-1">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Search companies, descriptions... (Press '/' to focus)"
                                    className="pl-9 bg-white dark:bg-[#35322D] dark:border-slate-800 dark:text-slate-50 placeholder:dark:text-slate-500"
                                    value={search}
                                    onChange={(e: any) => handleSearch(e.target.value)}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 font-mono border dark:border-slate-700 rounded px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800">/</div>
                            </div>

                            {/* Primary Filters */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2 px-3 py-2 border dark:border-slate-800 rounded-md bg-white dark:bg-[#35322D] shadow-sm">
                                    <SlidersHorizontal className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    <select
                                        className="text-sm border-none bg-transparent outline-none focus:ring-0 text-slate-700 dark:text-slate-300 w-32"
                                        value={sectorFilter}
                                        onChange={(e) => handleSector(e.target.value)}
                                    >
                                        <option value="">All Sectors</option>
                                        {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 px-3 py-2 border dark:border-slate-800 rounded-md bg-white dark:bg-[#35322D] shadow-sm">
                                    <SlidersHorizontal className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    <select
                                        className="text-sm border-none bg-transparent outline-none focus:ring-0 text-slate-700 dark:text-slate-300 w-32"
                                        value={stageFilter}
                                        onChange={(e) => handleStage(e.target.value)}
                                    >
                                        <option value="">All Stages</option>
                                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className={`text-sm dark:border-slate-700 dark:text-slate-300 transition-colors ${showAdvancedFilters ? 'bg-teal-50 border-teal-300 text-teal-700 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-400' : ''
                                        }`}
                                >
                                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                                    Advanced{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                                </Button>

                                {activeFilterCount > 0 && (
                                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400">
                                        Clear all
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Advanced Filters Panel */}
                        {showAdvancedFilters && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-xl border dark:border-slate-800 bg-slate-50/50 dark:bg-transparent transition-all">
                                {/* Location Filter */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</label>
                                    <select
                                        className="text-sm border dark:border-slate-700 rounded-md px-3 py-2 bg-white dark:bg-[#35322D] text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-teal-500"
                                        value={locationFilter}
                                        onChange={(e) => handleLocation(e.target.value)}
                                    >
                                        <option value="">All Locations</option>
                                        {locations.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>

                                {/* Enrichment Status */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Enrichment Status</label>
                                    <select
                                        className="text-sm border dark:border-slate-700 rounded-md px-3 py-2 bg-white dark:bg-[#35322D] text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-teal-500"
                                        value={enrichmentFilter}
                                        onChange={(e) => handleEnrichment(e.target.value)}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="enriched">✅ Enriched</option>
                                        <option value="pending">⏳ Pending Enrichment</option>
                                    </select>
                                </div>

                                {/* Thesis Score Minimum */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Min Thesis Score: <span className="text-teal-600 dark:text-teal-400 font-bold">{thesisScoreMin}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={thesisScoreMin}
                                        onChange={(e) => handleThesisScore(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
                                        <span>0</span>
                                        <span>50</span>
                                        <span>100</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-[#35322D] shadow-sm overflow-hidden transition-colors">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-transparent border-b dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                                    <tr>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('name')}>
                                            <div className="flex items-center gap-2">Company {getSortIcon('name')}</div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('sector')}>
                                            <div className="flex items-center gap-2">Sector & Stage {getSortIcon('sector')}</div>
                                        </th>
                                        <th className="px-6 py-4 hidden md:table-cell cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('location')}>
                                            <div className="flex items-center gap-2">Location {getSortIcon('location')}</div>
                                        </th>
                                        <th className="px-6 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {paginatedData.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                                No companies matched your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedData.map((co) => (
                                            <tr key={co.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-900 dark:text-slate-50 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                                            {co.name}
                                                        </span>
                                                        <span className="text-slate-500 dark:text-slate-400 line-clamp-1 text-xs mt-1 max-w-[300px]">
                                                            {co.description}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">{co.sector}</Badge>
                                                        <Badge variant="outline" className="text-slate-500 dark:text-slate-400 dark:border-slate-700">{co.stage}</Badge>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                                                    {co.location}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link href={`/companies/${co.id}`}>
                                                        <Button variant="ghost" size="sm" className="font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/50">
                                                            View profile &rarr;
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {totalPages > 0 && (
                            <div className="flex items-center justify-between px-6 py-3 border-t dark:border-slate-800 bg-slate-50 dark:bg-transparent text-sm text-slate-500 dark:text-slate-400 transition-colors">
                                <div>
                                    Showing <span className="font-medium text-slate-900 dark:text-slate-50">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900 dark:text-slate-50">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="font-medium text-slate-900 dark:text-slate-50">{filteredData.length}</span> results
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 p-0 dark:border-slate-700"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 w-8 p-0 dark:border-slate-700"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
