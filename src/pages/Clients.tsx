import { useState } from "react";
import { Search, Download, Plus, MoreHorizontal, AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const mockClients = [
  {
    id: 1,
    name: "COMISION ESTATAL DE AGUAS",
    email: "",
    rfc: "CEA800313C95",
    fiel: "active",
    csd: "warning",
    ciec: "warning",
    satStatus: "Rechazado",
  },
];

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Clients</h1>
      </div>

      {/* Controls */}
      <Card className="p-6 bg-card/50 backdrop-blur border-glass-border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Accountant Selector */}
            <div className="min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Contador
              </label>
              <Select defaultValue="any">
                <SelectTrigger className="bg-input/50 border-border">
                  <SelectValue placeholder="--- Seleccione cualquiera ---" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">--- Seleccione cualquiera ---</SelectItem>
                  <SelectItem value="contador1">Contador 1</SelectItem>
                  <SelectItem value="contador2">Contador 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Search client...
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input/50 border-border"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Descargar lista de clientes
            </Button>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Agregar
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button className="px-4 py-2 text-taxops-orange border-b-2 border-taxops-orange font-medium">
          Clientes
        </button>
        <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
          Estado de Certificados
        </button>
      </div>

      {/* Table */}
      <Card className="bg-card/50 backdrop-blur border-glass-border">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              mostrar{" "}
              <Select defaultValue="10">
                <SelectTrigger className="inline-flex w-auto bg-transparent border-0 p-0 h-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>{" "}
              entradas
            </div>
          </div>

          {mockClients.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-foreground">NOMBRE</th>
                    <th className="text-left p-4 font-medium text-foreground">EMAIL</th>
                    <th className="text-left p-4 font-medium text-foreground">RFC</th>
                    <th className="text-left p-4 font-medium text-foreground">ESTADO</th>
                    <th className="text-left p-4 font-medium text-foreground">ESTADO DEL CLIENTE SAT</th>
                    <th className="text-left p-4 font-medium text-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {mockClients.map((client) => (
                    <tr key={client.id} className="border-t border-border hover:bg-muted/20">
                      <td className="p-4 text-foreground font-medium">{client.name}</td>
                      <td className="p-4 text-muted-foreground">{client.email}</td>
                      <td className="p-4 text-foreground">{client.rfc}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-taxops-error rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">!</span>
                            </div>
                            <span className="text-xs text-muted-foreground">FIEL</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-taxops-error rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">!</span>
                            </div>
                            <span className="text-xs text-muted-foreground">CSD</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-taxops-error rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">!</span>
                            </div>
                            <span className="text-xs text-muted-foreground">CIEC</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="destructive" className="bg-taxops-error/20 text-taxops-error border-taxops-error/30">
                          {client.satStatus}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No clients found</h3>
              <p className="text-muted-foreground mb-4">Add a client to get started.</p>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Client
              </Button>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando 1 a 1 de 1 entradas
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Clients;