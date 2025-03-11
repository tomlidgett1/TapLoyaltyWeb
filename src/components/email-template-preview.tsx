import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, Mail, Calendar, Tag, MapPin } from "lucide-react"

interface EmailTemplatePreviewProps {
  isOpen: boolean
  onClose: () => void
  template: {
    id: string
    name: string
    category: string
  } | null
  campaignData?: {
    subject: string
    fromName: string
    fromEmail: string
    content?: string
    customization?: any
  }
}

export function EmailTemplatePreview({ isOpen, onClose, template, campaignData }: EmailTemplatePreviewProps) {
  if (!template) return null
  
  console.log("Template in preview:", template);
  console.log("Campaign data:", campaignData);
  
  // Generate a sample email preview based on the template type
  const renderEmailPreview = () => {
    console.log("Rendering template:", template.id);
    
    // Use a different approach to avoid conflicts with banner-preview
    if (template.id === "template-1") {
      return renderWelcomeEmail();
    } else if (template.id === "template-2") {
      return renderNewsletterEmail();
    } else if (template.id === "template-3") {
      return renderSpecialOfferEmail();
    } else if (template.id === "template-4") {
      return renderProductAnnouncementEmail();
    } else {
      return renderDefaultEmail();
    }
  };
  
  // Helper to render custom content if available
  const renderCustomContent = () => {
    if (!campaignData?.content) return null;
    
    return (
      <div className="custom-content mb-6 p-4 bg-gray-50 border-l-4 border-blue-500 rounded">
        <h3 className="font-medium mb-2">Custom Message</h3>
        <div className="whitespace-pre-wrap">
          {campaignData.content}
        </div>
      </div>
    );
  };
  
  const renderWelcomeEmail = () => {
    const custom = campaignData?.customization || {};
    
    return (
      <div className="email-preview">
        <div className="email-header bg-blue-50 p-4 text-center border-b">
          <h2 className="text-xl font-bold text-blue-800">Welcome to {campaignData?.fromName || "Our Business"}!</h2>
        </div>
        <div className="email-body p-6">
          <p className="mb-4">Hello there,</p>
          <p className="mb-4">Thank you for joining us! We're excited to have you as a customer.</p>
          
          {/* Insert custom content here */}
          {renderCustomContent()}
          
          <p className="mb-4">Here are some things you can do with your new account:</p>
          <ul className="list-disc pl-5 mb-4 space-y-2">
            <li>Browse our latest products</li>
            <li>Check out exclusive offers</li>
            <li>Earn rewards with every purchase</li>
            <li>Track your loyalty points</li>
          </ul>
          <div className="bg-blue-50 p-4 rounded-md mb-4">
            <p className="font-medium text-blue-800">Get {custom.welcomeDiscount || "10% off"} your first purchase!</p>
            <p>Use code: {custom.welcomeCode || "WELCOME10"}</p>
          </div>
          <p>If you have any questions, feel free to contact us.</p>
        </div>
        <div className="email-footer bg-gray-100 p-4 text-center text-sm text-gray-600 border-t">
          <p>© 2023 {campaignData?.fromName || "Our Business"}. All rights reserved.</p>
          <p className="mt-2">You're receiving this email because you signed up for our service.</p>
        </div>
      </div>
    );
  };
  
  const renderNewsletterEmail = () => {
    const custom = campaignData?.customization || {};
    
    return (
      <div className="email-preview">
        <div className="email-header bg-green-50 p-4 text-center border-b">
          <h2 className="text-xl font-bold text-green-800">Monthly Newsletter - {custom.newsletterDate || "June 2023"}</h2>
        </div>
        <div className="email-body p-6">
          <p className="mb-4">Hello valued customer,</p>
          
          {/* Insert custom content here */}
          {renderCustomContent()}
          
          <p className="mb-4">Here's what's new this month:</p>
          
          <div className="mb-6 border-b pb-4">
            <h3 className="font-bold text-lg mb-2 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-green-600" />
              Upcoming Events
            </h3>
            <p className="mb-2">Join us for our {custom.eventTitle || "summer kickoff party"} on {custom.eventDate || "June 15th"}!</p>
            <p>RSVP by {custom.eventRsvpDate || "June 10th"} to secure your spot.</p>
          </div>
          
          <div className="mb-6 border-b pb-4">
            <h3 className="font-bold text-lg mb-2 flex items-center">
              <Tag className="h-5 w-5 mr-2 text-green-600" />
              Special Offers
            </h3>
            <p className="mb-2">{custom.offerTitle || "Summer Sale"}: {custom.offerDescription || "25% off all seasonal items"}</p>
            <p>{custom.offerSecondary || "Buy one, get one 50% off on selected products"}</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-2 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-green-600" />
              Store Updates
            </h3>
            <p className="mb-2">{custom.storeUpdate1 || "We've extended our weekend hours for the summer season!"}</p>
            <p>{custom.storeUpdate2 || "New location opening next month - stay tuned for details."}</p>
          </div>
        </div>
        <div className="email-footer bg-gray-100 p-4 text-center text-sm text-gray-600 border-t">
          <p>© 2023 {campaignData?.fromName || "Our Business"}. All rights reserved.</p>
          <p className="mt-2">You're receiving this email because you signed up for our newsletter.</p>
        </div>
      </div>
    );
  };
  
  const renderSpecialOfferEmail = () => {
    const custom = campaignData?.customization || {};
    
    return (
      <div className="email-preview">
        <div className="email-header bg-red-50 p-4 text-center border-b">
          <h2 className="text-xl font-bold text-red-800">Special Offer Inside!</h2>
        </div>
        <div className="email-body p-6">
          <p className="mb-4">Hello there,</p>
          
          {/* Insert custom content here */}
          {renderCustomContent()}
          
          <p className="mb-4">We have an exclusive offer just for you!</p>
          
          <div className="bg-red-50 p-6 rounded-md mb-6 text-center">
            <h3 className="text-2xl font-bold text-red-800 mb-2">{custom.promoTitle || "FLASH SALE"}</h3>
            <p className="text-lg mb-2">Take an extra {custom.promoDiscount || "30% off"}</p>
            <p className="text-sm mb-4">Use code: {custom.promoCode || "FLASH30"}</p>
            <div className="inline-block bg-red-600 text-white font-bold py-2 px-6 rounded-full">
              Shop Now
            </div>
            <p className="text-xs mt-4">Offer valid until {custom.promoExpiry || "June 30, 2023"}</p>
          </div>
          
          <p className="mb-4">Don't miss out on these amazing deals:</p>
          <ul className="list-disc pl-5 mb-4 space-y-2">
            <li>Premium products at unbeatable prices</li>
            <li>Free shipping on orders over $50</li>
            <li>Exclusive member-only items</li>
          </ul>
          
          <p>Hurry, this offer won't last long!</p>
        </div>
        <div className="email-footer bg-gray-100 p-4 text-center text-sm text-gray-600 border-t">
          <p>© 2023 {campaignData?.fromName || "Our Business"}. All rights reserved.</p>
          <p className="mt-2">You're receiving this email because you're a valued customer.</p>
        </div>
      </div>
    );
  };
  
  const renderProductAnnouncementEmail = () => {
    const custom = campaignData?.customization || {};
    
    return (
      <div className="email-preview">
        <div className="email-header bg-purple-50 p-4 text-center border-b">
          <h2 className="text-xl font-bold text-purple-800">Introducing Our Newest Product!</h2>
        </div>
        <div className="email-body p-6">
          <p className="mb-4">Hello there,</p>
          
          {/* Insert custom content here */}
          {renderCustomContent()}
          
          <p className="mb-4">We're excited to announce our latest product:</p>
          
          <div className="bg-purple-50 p-6 rounded-md mb-6 text-center">
            <h3 className="text-2xl font-bold text-purple-800 mb-2">{custom.productName || "The Ultimate Widget Pro"}</h3>
            <p className="text-lg mb-4">{custom.productTagline || "Redesigned. Reimagined. Revolutionary."}</p>
            <div className="h-40 bg-gray-200 rounded-md mb-4 flex items-center justify-center">
              <FileText className="h-16 w-16 text-gray-400" />
            </div>
            <div className="inline-block bg-purple-600 text-white font-bold py-2 px-6 rounded-full">
              Learn More
            </div>
          </div>
          
          <p className="mb-4">Key features:</p>
          <ul className="list-disc pl-5 mb-4 space-y-2">
            <li>{custom.productFeature1 || "2x faster performance"}</li>
            <li>{custom.productFeature2 || "Enhanced user interface"}</li>
            <li>{custom.productFeature3 || "Longer battery life"}</li>
            <li>{custom.productFeature4 || "Advanced security features"}</li>
          </ul>
          
          <p className="mb-4">Available starting {custom.productLaunchDate || "July 1st"}. Pre-order now to be the first to get it!</p>
          
          <p>We can't wait to hear what you think about it.</p>
        </div>
        <div className="email-footer bg-gray-100 p-4 text-center text-sm text-gray-600 border-t">
          <p>© 2023 {campaignData?.fromName || "Our Business"}. All rights reserved.</p>
          <p className="mt-2">You're receiving this email because you're interested in our products.</p>
        </div>
      </div>
    );
  };
  
  const renderDefaultEmail = () => (
    <div className="flex flex-col items-center justify-center p-8">
      <FileText className="h-16 w-16 text-gray-400 mb-4" />
      <p className="text-gray-500 text-center max-w-md">
        This is a preview of the {template.name} template.
      </p>
      {campaignData?.content && (
        <div className="mt-4 p-4 border rounded-md max-w-md">
          <h3 className="font-medium mb-2">Custom Content:</h3>
          <div className="whitespace-pre-wrap text-sm">
            {campaignData.content}
          </div>
        </div>
      )}
    </div>
  );
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {campaignData?.subject || template.name}
          </DialogTitle>
          <DialogDescription>
            From: {campaignData?.fromName || "Your Business"} &lt;{campaignData?.fromEmail || "email@example.com"}&gt;
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 border rounded-md overflow-hidden">
          <div className="p-4 bg-white">
            {renderEmailPreview()}
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 