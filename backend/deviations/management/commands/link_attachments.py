import os
import glob
from django.core.management.base import BaseCommand
from django.conf import settings
from deviations.models import Deviation

class Command(BaseCommand):
    help = 'Links existing PDF files in media/deviation_attachments to their corresponding deviations'

    def handle(self, *args, **options):
        media_path = os.path.join(settings.MEDIA_ROOT, 'deviation_attachments')
        
        if not os.path.exists(media_path):
            self.stdout.write(self.style.ERROR(f'Media path does not exist: {media_path}'))
            return

        # Get all PDF files in the deviation_attachments folder
        pdf_files = glob.glob(os.path.join(media_path, '*.pdf'))
        
        linked_count = 0
        not_found_count = 0
        
        for pdf_path in pdf_files:
            filename = os.path.basename(pdf_path)
            
            # Extract deviation number from filename (e.g., DEV24-0439.pdf -> DEV24-0439)
            if filename.startswith('DEV') and '.pdf' in filename:
                # Handle files with additional suffixes like DEV24-0439_4vsYn5j.pdf
                base_dev_number = filename.split('.pdf')[0].split('_')[0]
                
                try:
                    deviation = Deviation.objects.get(dev_number=base_dev_number)
                    
                    # Only link if no attachment exists or if this is the main file (without suffix)
                    if not deviation.attachment or '_' not in filename.replace('.pdf', ''):
                        relative_path = f'deviation_attachments/{filename}'
                        deviation.attachment = relative_path
                        deviation.save()
                        linked_count += 1
                        self.stdout.write(f'Linked {filename} to {base_dev_number}')
                    
                except Deviation.DoesNotExist:
                    not_found_count += 1
                    self.stdout.write(self.style.WARNING(f'No deviation found for {base_dev_number} (file: {filename})'))

        self.stdout.write(self.style.SUCCESS(f'\nSummary:'))
        self.stdout.write(self.style.SUCCESS(f'Successfully linked: {linked_count} files'))
        self.stdout.write(self.style.WARNING(f'Files without matching deviations: {not_found_count}'))