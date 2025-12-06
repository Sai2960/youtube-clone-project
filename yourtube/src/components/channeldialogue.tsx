/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter } from "next/router";
import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

const Channeldialogue = ({ isopen, onclose, channeldata, mode }: any) => {
  const { user, updateUser } = useUser();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (channeldata && mode === "edit") {
      setFormData({
        name: channeldata.channelname || channeldata.name || "",
        description: channeldata.description || "",
      });
    } else {
      setFormData({
        name: user?.name || "",
        description: "",
      });
    }
  }, [channeldata, mode, user]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlesubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("Channel name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        channelname: formData.name.trim(),
        description: formData.description.trim(),
      };

      const response = await axiosInstance.patch(
        `/user/update/${user._id}`,
        payload
      );

      const updatedUser = response.data.result || response.data.user || response.data;
      
      if (!updatedUser.channelname) {
        updatedUser.channelname = payload.channelname;
        updatedUser.description = payload.description;
      }

      updateUser(updatedUser);
      onclose();

      setTimeout(() => {
        router.push(`/channel/${user._id}`);
      }, 100);

      setFormData({
        name: "",
        description: "",
      });

    } catch (error: any) {
      setError(
        error.response?.data?.message || 
        error.response?.data?.error ||
        "Failed to update channel. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isopen} onOpenChange={onclose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create your channel" : "Edit your channel"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Set up your channel to start uploading videos."
              : "Update your channel information."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlesubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Channel Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your channel name"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Channel Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Tell viewers about your channel..."
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="flex justify-between sm:justify-between gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onclose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Channel" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Channeldialogue;