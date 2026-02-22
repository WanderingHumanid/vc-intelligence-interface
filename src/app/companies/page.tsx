"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import companiesData from "../../../data/companies.json";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CompaniesPage() {
    const [search, setSearch] = useState("");
    const [sectorFilter, setSectorFilter] = useState("");
    const [stageFilter, setStageFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

    // Pagination calculation
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage]);

    // Handle page resets on filter change
    const handleSearch = (val: string) => { setSearch(val); setCurrentPage(1); };
    const handleSector = (val: string) => { setSectorFilter(val); setCurrentPage(1); };
    const handleStage = (val: string) => { setStageFilter(val); setCurrentPage(1); };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Discover</h1>
                <p className="text-slate-500">Search and filter active startup targets.</p>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {/* Search */}
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search companies, descriptions..."
                        className="pl-9 bg-white"
                        value={search}
                        onChange={(e: any) => handleSearch(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white shadow-sm">
                        <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                        <select
                            className="text-sm border-none bg-transparent outline-none focus:ring-0 text-slate-700 w-32"
                            value={sectorFilter}
                            onChange={(e) => handleSector(e.target.value)}
                        >
                            <option value="">All Sectors</option>
                            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white shadow-sm">
                        <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                        <select
                            className="text-sm border-none bg-transparent outline-none focus:ring-0 text-slate-700 w-32"
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
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Sector & Stage</th>
                                <th className="px-6 py-4 hidden md:table-cell">Location</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                                        No companies matched your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((co) => (
                                    <tr key={co.id} className="hover:bg-slate-50/70 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                    {co.name}
                                                </span>
                                                <span className="text-slate-500 line-clamp-1 text-xs mt-1 max-w-[300px]">
                                                    {co.description}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">{co.sector}</Badge>
                                                <Badge variant="outline" className="text-slate-500">{co.stage}</Badge>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 hidden md:table-cell">
                                            {co.location}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={`/companies/${co.id}`}>
                                                <Button variant="ghost" size="sm" className="font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50">
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
                    <div className="flex items-center justify-between px-6 py-3 border-t bg-slate-50 text-sm text-slate-500">
                        <div>
                            Showing <span className="font-medium text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="font-medium text-slate-900">{filteredData.length}</span> results
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
