"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Info } from "lucide-react";

export default function TestEnvPage() {
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
    console.log('Google Maps API Key:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Google Maps API Key Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
                <p className="text-sm text-gray-600">
                  {apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'Not found'}
                </p>
              </div>
              {apiKey ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Check browser console for debug logs. Delete this page after testing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 