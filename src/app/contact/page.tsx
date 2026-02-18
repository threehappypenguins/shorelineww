import ContactForm from "./contactForm";
import ContactInformation from "./contactInformation";

export default function ContactPage() {
  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Get In Touch
          </h1>
          <p className="text-lg text-muted-foreground">
            {"Have a project in mind? We'd love to hear from you. Reach out and let's discuss how we can bring your vision to life."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <ContactInformation />
          <ContactForm />
        </div>
      </div>
    </div>
  );
}