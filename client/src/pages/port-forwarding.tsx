import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { PortForwardingRule, InsertPortForwardingRule } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import TopBar from "@/components/top-bar";
import { Plus, Edit, Trash2, ArrowRightLeft } from "lucide-react";

export default function PortForwardingPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PortForwardingRule | null>(null);
  const [newRule, setNewRule] = useState<InsertPortForwardingRule>({
    name: "",
    protocol: "TCP",
    externalPort: 80,
    internalPort: 80,
    internalIp: "192.168.1.",
    isEnabled: true,
    description: "",
  });

  const { data: portRules, isLoading } = useQuery<PortForwardingRule[]>({
    queryKey: ["/api/port-forwarding"],
    refetchInterval: 30000,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (rule: InsertPortForwardingRule) => {
      return await apiRequest("POST", "/api/port-forwarding", rule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/port-forwarding"] });
      toast({
        title: "Success",
        description: "Port forwarding rule created successfully",
      });
      setIsAddDialogOpen(false);
      setNewRule({
        name: "",
        protocol: "TCP",
        externalPort: 80,
        internalPort: 80,
        internalIp: "192.168.1.",
        isEnabled: true,
        description: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create port forwarding rule",
        variant: "destructive",
      });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, rule }: { id: number; rule: Partial<PortForwardingRule> }) => {
      return await apiRequest("PUT", `/api/port-forwarding/${id}`, rule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/port-forwarding"] });
      toast({
        title: "Success",
        description: "Port forwarding rule updated successfully",
      });
      setEditingRule(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update port forwarding rule",
        variant: "destructive",
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/port-forwarding/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/port-forwarding"] });
      toast({
        title: "Success",
        description: "Port forwarding rule deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete port forwarding rule",
        variant: "destructive",
      });
    },
  });

  const handleCreateRule = () => {
    createRuleMutation.mutate(newRule);
  };

  const handleUpdateRule = (rule: PortForwardingRule) => {
    updateRuleMutation.mutate({ id: rule.id, rule });
  };

  const handleDeleteRule = (id: number) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleToggleRule = (rule: PortForwardingRule) => {
    updateRuleMutation.mutate({
      id: rule.id,
      rule: { ...rule, isEnabled: !rule.isEnabled },
    });
  };

  if (isLoading) {
    return (
      <div>
        <TopBar 
          title="Port Forwarding" 
          subtitle="Manage network port forwarding rules"
        />
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar 
        title="Port Forwarding" 
        subtitle="Manage network port forwarding rules"
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <ArrowRightLeft className="h-5 w-5" />
                <span>Port Forwarding Rules</span>
              </CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Port Forwarding Rule</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Rule Name</Label>
                      <Input
                        id="name"
                        value={newRule.name}
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                        placeholder="Web Server"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="protocol">Protocol</Label>
                        <Select
                          value={newRule.protocol}
                          onValueChange={(value) => setNewRule({ ...newRule, protocol: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TCP">TCP</SelectItem>
                            <SelectItem value="UDP">UDP</SelectItem>
                            <SelectItem value="Both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="external-port">External Port</Label>
                        <Input
                          id="external-port"
                          type="number"
                          value={newRule.externalPort}
                          onChange={(e) => setNewRule({ ...newRule, externalPort: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="internal-port">Internal Port</Label>
                        <Input
                          id="internal-port"
                          type="number"
                          value={newRule.internalPort}
                          onChange={(e) => setNewRule({ ...newRule, internalPort: parseInt(e.target.value) })}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="internal-ip">Internal IP</Label>
                        <Input
                          id="internal-ip"
                          value={newRule.internalIp}
                          onChange={(e) => setNewRule({ ...newRule, internalIp: e.target.value })}
                          placeholder="192.168.1.100"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newRule.description || ""}
                        onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newRule.isEnabled}
                        onCheckedChange={(checked) => setNewRule({ ...newRule, isEnabled: checked })}
                      />
                      <Label>Enable rule</Label>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateRule}
                        disabled={createRuleMutation.isPending || !newRule.name}
                      >
                        Create Rule
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {!portRules || portRules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No port forwarding rules configured
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead>External Port</TableHead>
                      <TableHead>Internal Destination</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rule.name}</div>
                            {rule.description && (
                              <div className="text-sm text-muted-foreground">{rule.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.protocol}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{rule.externalPort}</TableCell>
                        <TableCell className="font-mono">
                          {rule.internalIp}:{rule.internalPort}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={rule.isEnabled}
                              onCheckedChange={() => handleToggleRule(rule)}
                              disabled={updateRuleMutation.isPending}
                            />
                            <Badge
                              variant={rule.isEnabled ? "default" : "secondary"}
                              className={rule.isEnabled ? "bg-green-500 hover:bg-green-600" : ""}
                            >
                              {rule.isEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingRule(rule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRule(rule.id)}
                              disabled={deleteRuleMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Rule Dialog */}
        <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Port Forwarding Rule</DialogTitle>
            </DialogHeader>
            {editingRule && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Rule Name</Label>
                  <Input
                    id="edit-name"
                    value={editingRule.name}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-protocol">Protocol</Label>
                    <Select
                      value={editingRule.protocol}
                      onValueChange={(value) => setEditingRule({ ...editingRule, protocol: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TCP">TCP</SelectItem>
                        <SelectItem value="UDP">UDP</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-external-port">External Port</Label>
                    <Input
                      id="edit-external-port"
                      type="number"
                      value={editingRule.externalPort}
                      onChange={(e) => setEditingRule({ ...editingRule, externalPort: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-internal-port">Internal Port</Label>
                    <Input
                      id="edit-internal-port"
                      type="number"
                      value={editingRule.internalPort}
                      onChange={(e) => setEditingRule({ ...editingRule, internalPort: parseInt(e.target.value) })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-internal-ip">Internal IP</Label>
                    <Input
                      id="edit-internal-ip"
                      value={editingRule.internalIp}
                      onChange={(e) => setEditingRule({ ...editingRule, internalIp: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingRule.description || ""}
                    onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingRule.isEnabled}
                    onCheckedChange={(checked) => setEditingRule({ ...editingRule, isEnabled: checked })}
                  />
                  <Label>Enable rule</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingRule(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleUpdateRule(editingRule)}
                    disabled={updateRuleMutation.isPending}
                  >
                    Update Rule
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
