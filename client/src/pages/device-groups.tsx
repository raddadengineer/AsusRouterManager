import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { DeviceGroup, InsertDeviceGroup, DeviceTag, InsertDeviceTag, ConnectedDevice } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import TopBar from "@/components/top-bar";
import { Plus, Edit, Trash2, Users, Tag, Palette, FolderOpen, Settings, Smartphone, Laptop, Tablet, Monitor, Router, Speaker } from "lucide-react";

const iconOptions = [
  { value: "smartphone", label: "Smartphone", icon: Smartphone },
  { value: "laptop", label: "Laptop", icon: Laptop },
  { value: "tablet", label: "Tablet", icon: Tablet },
  { value: "monitor", label: "Monitor", icon: Monitor },
  { value: "router", label: "Router", icon: Router },
  { value: "speaker", label: "Speaker", icon: Speaker },
  { value: "users", label: "Users", icon: Users },
  { value: "settings", label: "Settings", icon: Settings },
];

const colorOptions = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", 
  "#F97316", "#06B6D4", "#84CC16", "#EC4899", "#6B7280"
];

export default function DeviceGroupsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"groups" | "tags">("groups");
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(null);
  const [editingTag, setEditingTag] = useState<DeviceTag | null>(null);
  const [newGroup, setNewGroup] = useState<InsertDeviceGroup>({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "users",
  });
  const [newTag, setNewTag] = useState<InsertDeviceTag>({
    name: "",
    color: "#6B7280",
  });

  const { data: groups, isLoading: groupsLoading } = useQuery<DeviceGroup[]>({
    queryKey: ["/api/device-groups"],
    refetchInterval: 30000,
  });

  const { data: tags, isLoading: tagsLoading } = useQuery<DeviceTag[]>({
    queryKey: ["/api/device-tags"],
    refetchInterval: 30000,
  });

  const { data: devices } = useQuery<ConnectedDevice[]>({
    queryKey: ["/api/devices"],
  });

  const createGroupMutation = useMutation({
    mutationFn: async (group: InsertDeviceGroup) => {
      return await apiRequest("POST", "/api/device-groups", group);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-groups"] });
      toast({
        title: "Success",
        description: "Device group created successfully",
      });
      setIsGroupDialogOpen(false);
      setNewGroup({ name: "", description: "", color: "#3B82F6", icon: "users" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create device group",
        variant: "destructive",
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, group }: { id: number; group: Partial<InsertDeviceGroup> }) => {
      return await apiRequest("PATCH", `/api/device-groups/${id}`, group);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-groups"] });
      toast({
        title: "Success",
        description: "Device group updated successfully",
      });
      setEditingGroup(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update device group",
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/device-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-groups"] });
      toast({
        title: "Success",
        description: "Device group deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete device group",
        variant: "destructive",
      });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (tag: InsertDeviceTag) => {
      return await apiRequest("POST", "/api/device-tags", tag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-tags"] });
      toast({
        title: "Success",
        description: "Device tag created successfully",
      });
      setIsTagDialogOpen(false);
      setNewTag({ name: "", color: "#6B7280" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create device tag",
        variant: "destructive",
      });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, tag }: { id: number; tag: Partial<InsertDeviceTag> }) => {
      return await apiRequest("PATCH", `/api/device-tags/${id}`, tag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-tags"] });
      toast({
        title: "Success",
        description: "Device tag updated successfully",
      });
      setEditingTag(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update device tag",
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/device-tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-tags"] });
      toast({
        title: "Success",
        description: "Device tag deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete device tag",
        variant: "destructive",
      });
    },
  });

  const handleCreateGroup = () => {
    if (!newGroup.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }
    createGroupMutation.mutate(newGroup);
  };

  const handleUpdateGroup = () => {
    if (!editingGroup) return;
    updateGroupMutation.mutate({
      id: editingGroup.id,
      group: editingGroup,
    });
  };

  const handleCreateTag = () => {
    if (!newTag.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Tag name is required",
        variant: "destructive",
      });
      return;
    }
    createTagMutation.mutate(newTag);
  };

  const handleUpdateTag = () => {
    if (!editingTag) return;
    updateTagMutation.mutate({
      id: editingTag.id,
      tag: editingTag,
    });
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : Users;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <TopBar title="Smart Device Grouping" />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Device Organization</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create custom groups and tags to organize your network devices efficiently
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("groups")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "groups"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <FolderOpen className="w-4 h-4 inline-block mr-2" />
            Device Groups
          </button>
          <button
            onClick={() => setActiveTab("tags")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "tags"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Tag className="w-4 h-4 inline-block mr-2" />
            Device Tags
          </button>
        </div>

        {/* Groups Tab */}
        {activeTab === "groups" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Device Groups</h2>
              <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Device Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="groupName">Group Name</Label>
                      <Input
                        id="groupName"
                        value={newGroup.name}
                        onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                        placeholder="Enter group name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="groupDescription">Description</Label>
                      <Textarea
                        id="groupDescription"
                        value={newGroup.description || ""}
                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                        placeholder="Enter group description"
                      />
                    </div>
                    <div>
                      <Label>Icon</Label>
                      <Select value={newGroup.icon} onValueChange={(value) => setNewGroup({ ...newGroup, icon: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map((option) => {
                            const IconComponent = option.icon;
                            return (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center">
                                  <IconComponent className="w-4 h-4 mr-2" />
                                  {option.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Color</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewGroup({ ...newGroup, color })}
                            className={`w-8 h-8 rounded-full border-2 ${
                              newGroup.color === color ? "border-gray-400" : "border-gray-200"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateGroup} disabled={createGroupMutation.isPending}>
                        Create Group
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {groupsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups?.map((group) => {
                  const IconComponent = getIconComponent(group.icon || "users");
                  return (
                    <Card key={group.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: group.color + "20" }}
                            >
                              <IconComponent 
                                className="w-5 h-5" 
                                style={{ color: group.color }}
                              />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{group.name}</CardTitle>
                              {group.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {group.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingGroup(group)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteGroupMutation.mutate(group.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4 mr-1" />
                          0 devices
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tags Tab */}
        {activeTab === "tags" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Device Tags</h2>
              <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Tag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Device Tag</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="tagName">Tag Name</Label>
                      <Input
                        id="tagName"
                        value={newTag.name}
                        onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                        placeholder="Enter tag name"
                      />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewTag({ ...newTag, color })}
                            className={`w-8 h-8 rounded-full border-2 ${
                              newTag.color === color ? "border-gray-400" : "border-gray-200"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsTagDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateTag} disabled={createTagMutation.isPending}>
                        Create Tag
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {tagsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tags?.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="p-3 justify-between hover:shadow-md transition-shadow cursor-pointer"
                    style={{ backgroundColor: tag.color + "20", color: tag.color }}
                  >
                    <span>{tag.name}</span>
                    <div className="flex space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTag(tag);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTagMutation.mutate(tag.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Group Dialog */}
        <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Device Group</DialogTitle>
            </DialogHeader>
            {editingGroup && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editGroupName">Group Name</Label>
                  <Input
                    id="editGroupName"
                    value={editingGroup.name}
                    onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editGroupDescription">Description</Label>
                  <Textarea
                    id="editGroupDescription"
                    value={editingGroup.description || ""}
                    onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select 
                    value={editingGroup.icon || "users"} 
                    onValueChange={(value) => setEditingGroup({ ...editingGroup, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center">
                              <IconComponent className="w-4 h-4 mr-2" />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditingGroup({ ...editingGroup, color })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          editingGroup.color === color ? "border-gray-400" : "border-gray-200"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditingGroup(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateGroup} disabled={updateGroupMutation.isPending}>
                    Update Group
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Tag Dialog */}
        <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Device Tag</DialogTitle>
            </DialogHeader>
            {editingTag && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editTagName">Tag Name</Label>
                  <Input
                    id="editTagName"
                    value={editingTag.name}
                    onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditingTag({ ...editingTag, color })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          editingTag.color === color ? "border-gray-400" : "border-gray-200"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditingTag(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateTag} disabled={updateTagMutation.isPending}>
                    Update Tag
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