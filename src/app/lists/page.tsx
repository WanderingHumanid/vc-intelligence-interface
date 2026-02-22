"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorage";
import companiesData from "../../../data/companies.json";
import { Bookmark, Plus, Trash2, Download, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserList {
    id: string;
    name: string;
    companyIds: string[];
}

export default function ListsPage() {
    const [lists, setLists] = useLocalStorageState<UserList[]>("USER_LISTS", []);
    const [newListName, setNewListName] = useState("");

    const handleCreateList = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim()) return;

        const newList: UserList = {
            id: crypto.randomUUID(),
            name: newListName.trim(),
            companyIds: []
        };

        setLists([...lists, newList]);
        setNewListName("");
    };

    const handleDeleteList = (id: string) => {
        if (confirm("Are you sure you want to delete this list?")) {
            setLists(lists.filter(l => l.id !== id));
        }
    };

    const handleRemoveCompany = (listId: string, companyId: string) => {
        setLists(lists.map(l => {
            if (l.id === listId) {
                return { ...l, companyIds: l.companyIds.filter(id => id !== companyId) };
            }
            return l;
        }));
    };

    const handleExportCSV = (list: UserList) => {
        const listCompanies = companiesData.filter(c => list.companyIds.includes(c.id));
        if (listCompanies.length === 0) return;

        const headers = ["Name", "Website", "Sector", "Stage", "Location", "Founded", "Headcount"];
        const rows = listCompanies.map(c => [
            `"${c.name}"`, `"${c.website}"`, `"${c.sector}"`, `"${c.stage}"`,
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
    };

    const handleExportJSON = (list: UserList) => {
        const listCompanies = companiesData.filter(c => list.companyIds.includes(c.id));
        if (listCompanies.length === 0) return;

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(listCompanies, null, 2))}`;
        const link = document.createElement("a");
        link.setAttribute("href", jsonString);
        link.setAttribute("download", `vc_intelligence_export_${list.name.replace(/\s+/g, '_')}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Lists</h1>
                <p className="text-slate-500">Manage your saved collections and export for outreach or diligence.</p>
            </div>

            {/* Create List Form */}
            <Card className="bg-white border-slate-200 shadow-sm max-w-lg">
                <CardContent className="pt-6">
                    <form onSubmit={handleCreateList} className="flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                            <label htmlFor="listName" className="text-sm font-medium text-slate-700">New List Name</label>
                            <Input
                                id="listName"
                                placeholder="e.g. Q3 Fintech Targets"
                                value={newListName}
                                onChange={(e: any) => setNewListName(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="w-4 h-4 mr-2" /> Create
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Lists Display */}
            <div className="flex flex-col gap-6">
                {lists.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center border rounded-xl border-dashed bg-slate-50">
                        <Bookmark className="w-8 h-8 text-slate-300 mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">No lists yet</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm">Create a list above, then add companies to it from their profile pages.</p>
                    </div>
                ) : (
                    lists.map(list => {
                        const listCompanies = companiesData.filter(c => list.companyIds.includes(c.id));
                        return (
                            <Card key={list.id} className="border-slate-200 shadow-sm overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b pb-4 flex flex-row items-center justify-between space-y-0">
                                    <div className="flex items-center gap-3">
                                        <Bookmark className="w-5 h-5 text-blue-600" />
                                        <CardTitle className="text-lg text-slate-900">{list.name}</CardTitle>
                                        <Badge variant="secondary" className="ml-2 bg-white text-slate-500 border shadow-sm">
                                            {list.companyIds.length} {list.companyIds.length === 1 ? 'company' : 'companies'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleExportCSV(list)}
                                            disabled={list.companyIds.length === 0}
                                            className="text-slate-600"
                                        >
                                            CSV
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleExportJSON(list)}
                                            disabled={list.companyIds.length === 0}
                                            className="text-slate-600"
                                        >
                                            JSON
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteList(list.id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {listCompanies.length === 0 ? (
                                        <div className="py-8 text-center text-sm text-slate-500">
                                            This list is empty. Add companies from the specific company profiles.
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-slate-100">
                                            {listCompanies.map(company => (
                                                <li key={company.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <Link href={`/companies/${company.id}`} className="font-medium text-sm text-slate-900 hover:text-blue-600">
                                                                {company.name}
                                                            </Link>
                                                            <span className="text-xs text-slate-500">{company.sector} · {company.stage}</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveCompany(list.id, company.id)}
                                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 font-normal"
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
        </div>
    );
}
