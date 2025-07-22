# deviation_tracker_app/deviation_backend/deviations/views.py (FINAL, FULLY MODIFIED CODE - ManyToMany Responsibles)

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.db import transaction, models # Import transaction and models for Max
from django.shortcuts import get_object_or_404
from django.db.models import Q # Import Q for complex queries

from .models import Deviation, Action
from .serializers import DeviationSerializer, ActionSerializer, UserSerializer


# Existing: Deviation List/Create API View
class DeviationListCreateAPIView(generics.ListCreateAPIView):
    queryset = Deviation.objects.all().order_by('dev_number')
    serializer_class = DeviationSerializer
    permission_classes = [IsAuthenticated]

    # UPDATED: get_queryset to filter by current user (for 'View My Deviations')
    def get_queryset(self):
        queryset = super().get_queryset()
        my_deviations_param = self.request.query_params.get('my_deviations', 'false').lower()
        
        if my_deviations_param == 'true':
            user = self.request.user
            if user.is_authenticated:
                queryset = queryset.filter(
                    Q(created_by_user=user) |
                    Q(actions__action_responsible_users=user) # <--- UPDATED: Filter by ManyToMany field
                ).distinct()
        return queryset


# Existing: Deviation Detail/Update/Delete API View
class DeviationDetailUpdateDeleteAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Deviation.objects.all()
    serializer_class = DeviationSerializer
    lookup_field = 'dev_number'
    permission_classes = [IsAuthenticated]

# Existing: Action List/Create API View
class ActionListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ActionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        dev_number = self.kwargs['dev_number']
        return Action.objects.filter(deviation__dev_number=dev_number).order_by('order', 'id')

    def perform_create(self, serializer):
        dev_number = self.kwargs['dev_number']
        deviation = generics.get_object_or_404(Deviation, dev_number=dev_number)
        serializer.save(deviation=deviation)

# Existing: Action Detail/Update/Delete API View
class ActionDetailUpdateDeleteAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Action.objects.all()
    serializer_class = ActionSerializer
    lookup_url_kwarg = 'action_id'
    permission_classes = [IsAuthenticated]


# --- User/Authentication API Views ---
class UserListAPIView(generics.ListAPIView):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

class CurrentUserAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

# --- Action Reordering API View ---
class ReorderActionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, dev_number):
        deviation = get_object_or_404(Deviation, dev_number=dev_number)
        new_order_data = request.data.get('new_order', [])

        if not isinstance(new_order_data, list):
            return Response({'detail': 'Invalid data format. Expected a list of action objects.'}, status=status.HTTP_400_BAD_REQUEST)

        new_order_map = {item['id']: item['order'] for item in new_order_data}
        actions_to_update_qs = Action.objects.filter(id__in=new_order_map.keys(), deviation=deviation)

        if len(actions_to_update_qs) != len(new_order_map.keys()):
            return Response({'detail': 'One or more actions not found or do not belong to this deviation.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Step 1: Temporarily set all affected orders to a high, non-conflicting value.
            max_current_order = Action.objects.filter(deviation=deviation).aggregate(models.Max('order'))['order__max'] or 0
            temp_offset = max_current_order + 1000

            for action_instance in actions_to_update_qs:
                Action.objects.filter(id=action_instance.id).update(order=temp_offset + action_instance.order)

            # Step 2: Set the final, correct order values.
            for item in new_order_data:
                action_id = item['id']
                final_order_value = item['order']
                Action.objects.filter(id=action_id).update(order=final_order_value)

        deviation.refresh_from_db()
        serializer = DeviationSerializer(deviation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
