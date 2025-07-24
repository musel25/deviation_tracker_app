from django.core.management.base import BaseCommand
from deviations.excel_data_manager import import_deviations_from_excel_to_db

class Command(BaseCommand):
    help = 'Imports deviations and actions from Deviation_Matrix.xlsx file'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting deviation import from Deviation_Matrix.xlsx...'))
        try:
            import_deviations_from_excel_to_db()
            self.stdout.write(self.style.SUCCESS('Deviation import completed successfully!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during deviation import: {e}'))