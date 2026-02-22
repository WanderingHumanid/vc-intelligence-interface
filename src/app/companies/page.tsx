"use client";

import { useState, useMemo, Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon, SlidersHorizontal, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CompaniesPage() {
    const [search, setSearch] = useState("");
    const [sectorFilter, setSectorFilter] = useState("");
    const [stageFilter, setStageFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
    const [companiesData, setCompaniesData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const searchInputRef = useRef<HTMLInputElement>(null);
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
    const sectors = useMemo(() => Array.from(new Set(companiesData.map(c => c.sector))).sort(), []);
    const stages = useMemo(() => Array.from(new Set(companiesData.map(c => c.stage))).sort(), []);

    // Filter mechanism
    const filteredData = useMemo(() => {
        return companiesData.filter(company => {
            const matchesSearch =
                company.name.toLowerCase().includes(search.toLowerCase()) ||
                company.description.toLowerCase().includes(search.toLowerCase());
            const matchesSector = sectorFilter ? company.sector === sectorFilter : true;
            const matchesStage = stageFilter ? company.stage === stageFilter : true;
            return matchesSearch && matchesSector && matchesStage;
        });
    }, [search, sectorFilter, stageFilter]);

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

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Discover</h1>
                <p className="text-slate-500 dark:text-slate-400">Search and filter active startup targets.</p>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-500 animate-pulse">
                    Loading companies...
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        {/* Search */}
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Search companies, descriptions... (Press '/' to focus)"
                                className="pl-9 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 placeholder:dark:text-slate-500"
                                value={search}
                                onChange={(e: any) => handleSearch(e.target.value)}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 font-mono border dark:border-slate-700 rounded px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800">/</div>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-2 border dark:border-slate-800 rounded-md bg-white dark:bg-slate-950 shadow-sm">
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

                            <div className="flex items-center gap-2 px-3 py-2 border dark:border-slate-800 rounded-md bg-white dark:bg-slate-950 shadow-sm">
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
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden transition-colors">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
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
                                                        <span className="font-semibold text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
                                                        <Button variant="ghost" size="sm" className="font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/50">
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
                            <div className="flex items-center justify-between px-6 py-3 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-500 dark:text-slate-400 transition-colors">
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
